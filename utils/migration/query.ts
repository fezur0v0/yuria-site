import { randomUUID } from 'node:crypto';
import { visibleContent, type ContentDocument, type ContentRow } from './content.ts';
import { CONTENT_TABLES } from './backup.ts';

export type TableName = typeof CONTENT_TABLES[number];
export const COLUMNS: Record<TableName, readonly string[]> = {
  site_config: ['key', 'value'],
  site_settings: ['id', 'nickname', 'bio', 'avatar_url', 'links', 'hero_image_url', 'hero_title', 'gallery_hero_title', 'gallery_hero_lines', 'updated_at'],
  hero_lines: ['id', 'text', 'sort_order', 'created_at'], intro_lines: ['id', 'text', 'sort_order'],
  music_tracks: ['id', 'title', 'artist', 'src', 'cover_url', 'sort_order', 'created_at'],
  portfolio_items: ['id', 'title', 'category', 'date', 'tags', 'content', 'cover_url', 'images', 'sort_order', 'is_visible', 'created_at', 'updated_at'],
  gallery_albums: ['id', 'title', 'description', 'cover_image_url', 'sort_order', 'is_visible', 'is_featured_home', 'is_locked', 'created_at', 'updated_at'],
  gallery_images: ['id', 'album_id', 'image_url', 'caption', 'sort_order', 'created_at'],
  theater_cards: ['id', 'title', 'content', 'category', 'tags', 'author', 'created_at', 'updated_at'],
  theater_records: ['id', 'title', 'extra_tag', 'content', 'images', 'card_id', 'character_id', 'created_at', 'updated_at'],
  characters: ['id', 'name', 'avatar', 'created_at'],
};
export function tableName(value: string): TableName {
  if (!(CONTENT_TABLES as readonly string[]).includes(value)) throw new Error('不支持的内容类型');
  return value as TableName;
}
function column(table: TableName, name: string) {
  if (!COLUMNS[table].includes(name)) throw new Error('不支持的内容字段');
  return name;
}
export function splitTerms(value: string): string[] {
  const parts: string[] = [];
  let depth = 0, quoted = false, escaped = false, start = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (char === '(' || char === '{') depth++;
    if (char === ')' || char === '}') depth--;
    if (depth < 0) throw new Error('筛选格式无效');
    if (char === ',' && depth === 0) { parts.push(value.slice(start, i)); start = i + 1; }
  }
  if (depth || quoted || escaped) throw new Error('筛选格式无效');
  parts.push(value.slice(start));
  return parts.map(part => part.trim());
}
const unquote = (value: string) => value.startsWith('"') ? JSON.parse(value) as string : value;
function list(value: string, open: string, close: string) {
  if (!value.startsWith(open) || !value.endsWith(close)) throw new Error('列表格式无效');
  return value.length === 2 ? [] : splitTerms(value.slice(1, -1)).map(unquote);
}
function testValue(value: unknown, expression: string): boolean {
  const index = expression.indexOf('.');
  if (index < 0) throw new Error('筛选操作无效');
  const op = expression.slice(0, index), expected = expression.slice(index + 1);
  if (op === 'not') return value == null && !expected.startsWith('is.') ? false : !testValue(value, expected);
  if (op === 'eq') return value !== null && value !== undefined && String(value) === unquote(expected);
  if (op === 'neq') return value !== null && value !== undefined && String(value) !== unquote(expected);
  if (op === 'is') {
    if (expected === 'null') return value === null || value === undefined;
    if (expected === 'true') return value === true;
    if (expected === 'false') return value === false;
    throw new Error('is 筛选无效');
  }
  if (op === 'in') return value != null && list(expected, '(', ')').includes(String(value));
  if (op === 'cs') return Array.isArray(value) && list(expected, '{', '}').every(item => value.includes(item));
  if (op === 'ilike') {
    if (typeof value !== 'string') return false;
    const pattern = unquote(expected).split('').map(char => char === '%' || char === '*' ? '.*' :
      char === '_' ? '.' : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
    return new RegExp(`^${pattern}$`, 'isu').test(value);
  }
  throw new Error('不支持的筛选操作');
}
export function matches(table: TableName, row: ContentRow, params: URLSearchParams) {
  let result = true;
  for (const [name, value] of params) {
    if (['select', 'order', 'offset', 'limit', 'columns', 'on_conflict'].includes(name)) continue;
    if (name === 'or') {
      const terms = list(value, '(', ')');
      // Validate every term, even if an earlier term already matched.
      const hits = terms.map(term => { const dot = term.indexOf('.');
        return testValue(row[column(table, term.slice(0, dot))], term.slice(dot + 1)); });
      result = hits.some(Boolean) && result;
    } else result = testValue(row[column(table, name)], value) && result;
  }
  return result;
}
function project(table: TableName, row: ContentRow, select: string, document: ContentDocument): ContentRow {
  const result: ContentRow = {};
  for (const name of splitTerms(select)) {
    if (name === '*') { for (const field of COLUMNS[table]) result[field] = row[field] ?? null; continue; }
    const join = /^(characters|theater_cards)\((.+)\)$/.exec(name);
    if (join) {
      if (table !== 'theater_records') throw new Error('不支持的内容关联');
      const related = join[1] as 'characters' | 'theater_cards';
      const id = row[related === 'characters' ? 'character_id' : 'card_id'];
      const target = document.tables[related].find(item => item.id === id);
      // Validate nested columns even when the relation is absent.
      const selected = project(related, target ?? {}, join[2], document);
      result[related] = target ? selected : null;
    } else result[column(table, name)] = row[name] ?? null;
  }
  return result;
}
function integer(value: string | null, fallback: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('分页参数无效');
  return Number(value);
}
export function queryContent(source: ContentDocument, owner: boolean, table: TableName, params: URLSearchParams) {
  const document = visibleContent(source, owner);
  // Validate the query even on empty collections.
  matches(table, {}, params);
  project(table, {}, params.get('select') ?? '*', document);
  let rows = document.tables[table].filter(row => matches(table, row, params));
  const count = rows.length;
  const order = params.get('order');
  if (order) {
    const terms = splitTerms(order).map(term => {
      const [field, ...options] = term.split('.');
      column(table, field);
      if (options.some(option => !['asc', 'desc', 'nullsfirst', 'nullslast'].includes(option))) throw new Error('排序参数无效');
      return { field, desc: options.includes('desc'), first: options.includes('nullsfirst') || (options.includes('desc') && !options.includes('nullslast')) };
    });
    rows = rows.toSorted((a, b) => {
      for (const term of terms) {
        const x = a[term.field], y = b[term.field];
        if (x === y) continue;
        if (x == null) return term.first ? -1 : 1;
        if (y == null) return term.first ? 1 : -1;
        const compared = x < y ? -1 : 1;
        return term.desc ? -compared : compared;
      }
      return 0;
    });
  }
  const offset = integer(params.get('offset'), 0), limit = integer(params.get('limit'), 1000);
  return { count, offset, rows: rows.slice(offset, offset + Math.min(limit, 1000)).map(row => project(table, row, params.get('select') ?? '*', document)) };
}

export function mutateContent(document: ContentDocument, table: TableName, method: string,
  params: URLSearchParams, input: unknown, upsert: boolean) {
  let rows = document.tables[table];
  const primaryKey = table === 'site_config' ? 'key' : 'id';
  if (params.has('on_conflict') && params.get('on_conflict') !== primaryKey) throw new Error('仅支持按主键合并');
  const now = new Date().toISOString();
  const changed: ContentRow[] = [];
  if (method === 'POST') {
    for (const value of Array.isArray(input) ? input : [input]) {
      const patch = validatePatch(table, value);
      let id = patch[primaryKey];
      if (id == null) {
        if (table === 'site_config') throw new Error('设置名称不能为空');
        id = ['music_tracks', 'intro_lines'].includes(table) ? Math.max(0, ...rows.map(row => Number(row.id) || 0)) + 1 :
          table === 'site_settings' ? true : randomUUID();
      }
      const existing = rows.find(row => row[primaryKey] === id);
      if (existing && !upsert) throw new Error('记录已存在');
      if (existing) { Object.assign(existing, patch); changed.push(existing); continue; }
      const row: ContentRow = Object.fromEntries(COLUMNS[table].map(name => [name, null]));
      for (const key of ['created_at', 'updated_at']) if (key in row) row[key] = now;
      for (const key of ['tags', 'images', 'gallery_hero_lines']) if (key in row) row[key] = [];
      for (const key of ['is_visible', 'is_locked', 'is_featured_home']) if (key in row) row[key] = false;
      if ('sort_order' in row) row.sort_order = 0;
      Object.assign(row, patch, { [primaryKey]: id });
      rows.push(row); changed.push(row);
    }
  } else {
    const filters = [...params.keys()].filter(name => !['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(name));
    if (!filters.length) throw new Error('修改和删除必须指定记录');
    matches(table, {}, params);
    const targets = rows.filter(row => matches(table, row, params));
    if (method === 'PATCH') {
      const patch = validatePatch(table, input);
      if (primaryKey in patch) throw new Error('不能修改记录标识');
      for (const row of targets) { Object.assign(row, patch); changed.push(row); }
    } else if (method === 'DELETE') {
      // Preserve the database's existing FK actions: album -> images CASCADE,
      // card -> records SET NULL, character -> records NO ACTION.
      if (table === 'gallery_albums') document.tables.gallery_images = document.tables.gallery_images.filter(image => !targets.some(row => row.id === image.album_id));
      if (table === 'theater_cards') for (const record of document.tables.theater_records) {
        if (targets.some(row => row.id === record.card_id)) record.card_id = null;
      }
      if (table === 'characters' && document.tables.theater_records.some(record =>
        targets.some(row => row.id === record.character_id))) throw new Error('记录仍被小剧场引用');
      changed.push(...targets); rows = rows.filter(row => !targets.includes(row));
      document.tables[table] = rows;
    } else throw new Error('不支持的保存操作');
  }
  for (const row of changed) {
    if (method !== 'DELETE') {
      const required: Partial<Record<TableName, string[]>> = {
        site_config: ['key'], site_settings: ['id'], hero_lines: ['text'], intro_lines: ['text'],
        music_tracks: ['title'], portfolio_items: ['title'], gallery_albums: ['title', 'sort_order', 'is_visible', 'is_featured_home', 'is_locked'],
        gallery_images: ['album_id', 'image_url'], theater_cards: ['title'], characters: ['name'],
      };
      if ((required[table] ?? []).some(key => row[key] == null)) throw new Error('缺少必填内容');
      for (const key of ['is_visible', 'is_locked', 'is_featured_home']) {
        if (row[key] != null && typeof row[key] !== 'boolean') throw new Error('发布状态格式无效');
      }
      if (row.sort_order != null && !Number.isSafeInteger(row.sort_order)) throw new Error('排序数值无效');
      if (row.tags != null && (!Array.isArray(row.tags) || row.tags.some(value => typeof value !== 'string'))) throw new Error('标签格式无效');
    }
    for (const [field, target] of [['album_id', 'gallery_albums'], ['character_id', 'characters'], ['card_id', 'theater_cards']] as const) {
      if (row[field] != null && !document.tables[target].some(item => item.id === row[field])) throw new Error('关联记录不存在');
    }
  }
  return changed.map(row => project(table, row, params.get('select') ?? '*', document));
}
function validatePatch(table: TableName, value: unknown): ContentRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('保存内容格式无效');
  for (const name of Object.keys(value)) column(table, name);
  return structuredClone(value) as ContentRow;
}
