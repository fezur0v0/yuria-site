import { createHash } from 'node:crypto';
import { CONTENT_TABLES } from './backup.ts';

export type ContentRow = Record<string, unknown>;
export type ContentTables = Record<typeof CONTENT_TABLES[number], ContentRow[]>;
export type ContentDocument = { version: 1; tables: ContentTables };

export function decodeContent(bytes: Uint8Array): ContentDocument {
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (value?.version !== 1 || !value.tables || Object.keys(value.tables).length !== CONTENT_TABLES.length) {
    throw new Error('内容文档格式无效');
  }
  for (const name of CONTENT_TABLES) {
    const rows = value.tables[name];
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error('内容表格式无效');
    }
    const key = name === 'site_config' ? 'key' : 'id';
    const ids = new Set();
    for (const row of rows) {
      if (!['string', 'number', 'boolean'].includes(typeof row[key]) || ids.has(row[key])) {
        throw new Error('内容记录标识缺失或重复');
      }
      ids.add(row[key]);
    }
  }
  return value;
}

// Filter before searching, joining, counting or projecting any fields.
export function visibleContent(document: ContentDocument, owner: boolean): ContentDocument {
  const copy = structuredClone(document);
  if (owner) return copy;
  copy.tables.portfolio_items = copy.tables.portfolio_items.filter(row => row.is_visible === true);
  copy.tables.gallery_albums = copy.tables.gallery_albums.filter(row => row.is_visible === true && row.is_locked !== true);
  const albums = new Set(copy.tables.gallery_albums.map(row => row.id));
  copy.tables.gallery_images = copy.tables.gallery_images.filter(row => albums.has(row.album_id));
  copy.tables.theater_cards = [];
  copy.tables.theater_records = [];
  copy.tables.characters = [];
  copy.tables.site_config = copy.tables.site_config.filter(row => ['cover_url', 'signature'].includes(String(row.key)));
  return copy;
}

export function searchContent(document: ContentDocument, owner: boolean, query: string) {
  const visible = visibleContent(document, owner);
  const needle = query.trim().toLocaleLowerCase();
  const tables = owner ? ['portfolio_items', 'theater_cards', 'theater_records'] as const : ['portfolio_items'] as const;
  return tables.flatMap(table => visible.tables[table]
    .filter(row => needle && [row.title, row.content].some(value =>
      typeof value === 'string' && value.replace(/<[^>]*>/g, '').toLocaleLowerCase().includes(needle)))
    .map(row => ({ table, id: row.id, title: row.title })));
}

export function verifyBackupBytes(bytes: Uint8Array, expected: { bytes: number; sha256: string }) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (bytes.byteLength !== expected.bytes || digest !== expected.sha256) throw new Error('备份内容校验失败');
}

export type VersionedStore = {
  read: () => Promise<{ bytes: Uint8Array; etag: string }>;
  write: (bytes: Uint8Array, expectedEtag: string) => Promise<boolean>;
};

// All content lives in one versioned private document for this small, single-owner site.
// A stale edit must fail instead of silently overwriting changes from another device.
export async function updateContent(store: VersionedStore, expectedEtag: string,
  change: (document: ContentDocument) => ContentDocument) {
  const current = await store.read();
  if (current.etag !== expectedEtag) throw new Error('内容已更新，请重新读取后再保存');
  const next = change(decodeContent(current.bytes));
  const bytes = new TextEncoder().encode(JSON.stringify(next));
  decodeContent(bytes);
  if (!await store.write(bytes, expectedEtag)) throw new Error('保存时发生编辑冲突，请重新读取');
  return next;
}
