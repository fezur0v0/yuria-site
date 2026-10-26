import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { queryContent, mutateContent, splitTerms, tableName } from '../utils/migration/query.ts';
import { adaptPrivateMedia } from '../utils/migration/mediaUrls.ts';
import { previewMatches } from '../utils/migration/preview.ts';

function fixture() {
  const tables = Object.fromEntries(CONTENT_TABLES.map(name => [name, []]));
  tables.portfolio_items = [
    { id: 'a', title: '甲', content: '一颗星', category: '随笔', tags: ['雨', '夜'], date: '2026-01-01', is_visible: true },
    { id: 'b', title: '乙', content: '月亮', category: '随笔', tags: ['夜'], date: '2026-02-01', is_visible: true },
    { id: 'c', title: '草稿', content: '私人星星', category: '草稿', tags: [], date: null, is_visible: false },
  ];
  tables.gallery_albums = [{ id: 'album', is_visible: true }, { id: 'hidden', is_visible: false }];
  tables.gallery_images = [{ id: 'image', album_id: 'album', image_url: 'https://public.example/image.jpg' },
    { id: 'secret', album_id: 'hidden', image_url: 'https://private.example/image.jpg' }];
  tables.characters = [{ id: 'char', name: '角色', avatar: 'private.png' }];
  tables.theater_cards = [{ id: 'card', title: '卡片', tags: ['雨', '夜'], content: '内容', category: '记录' }];
  tables.theater_records = [{ id: 'record', title: '记录', content: '正文', character_id: 'char', card_id: 'card' }];
  tables.site_config = [{ key: 'signature', value: '签名' }];
  return { version: 1, tables };
}
function query(document, owner, table, values) {
  return queryContent(document, owner, table, new URLSearchParams(values));
}
test('pagination counts only published rows and applies ordering before slicing', () => {
  const result = query(fixture(), false, 'portfolio_items', { select: 'id,title', order: 'date.desc', offset: '1', limit: '1' });
  assert.equal(result.count, 2);
  assert.deepEqual(result.rows, [{ id: 'a', title: '甲' }]);
});
test('private gallery relationships and draft text are not exposed through filters', () => {
  assert.equal(query(fixture(), false, 'gallery_images', { album_id: 'eq.hidden' }).count, 0);
  assert.equal(query(fixture(), false, 'portfolio_items', { or: '(title.ilike.%私人%,content.ilike.%私人%)' }).count, 0);
  assert.equal(query(fixture(), false, 'theater_records', { select: '*,characters(id,name,avatar)' }).count, 0);
});
test('text search, tag inclusion/exclusion and category filters match the editor queries', () => {
  assert.deepEqual(query(fixture(), true, 'portfolio_items', { select: 'id', or: '(title.ilike.%甲%,content.ilike.%星%)', tags: 'cs.{雨}', category: 'in.(随笔)' }).rows, [{ id: 'a' }]);
  assert.deepEqual(query(fixture(), true, 'portfolio_items', { select: 'id', tags: 'not.cs.{雨}', category: 'neq.草稿' }).rows, [{ id: 'b' }]);
});
test('record joins return selected character/card fields to owners only', () => {
  const rows = query(fixture(), true, 'theater_records', { select: 'id,characters(id,name),theater_cards(id,title)' }).rows;
  assert.deepEqual(rows, [{ id: 'record', characters: { id: 'char', name: '角色' }, theater_cards: { id: 'card', title: '卡片' } }]);
});
test('unknown fields and unsupported operators fail even on empty collections', () => {
  for (const params of [{ password: 'eq.x' }, { title: 'unsupported.x' }, { select: 'password' }, { order: 'password' }]) {
    assert.throws(() => query(fixture(), false, 'music_tracks', params));
  }
  assert.throws(() => tableName('auth.users'));
});
test('quoted category and tag lists preserve embedded commas', () => {
  const source = fixture(); source.tables.theater_cards[0].tags = ['one,two'];
  assert.equal(query(source, true, 'theater_cards', { tags: 'cs.{"one,two"}' }).count, 1);
  assert.deepEqual(splitTerms('id,characters(id,name),title'), ['id', 'characters(id,name)', 'title']);
  assert.throws(() => splitTerms('characters(id,name'));
});
test('SQL null behavior, wildcard escaping and zero-size pagination stay predictable', () => {
  const source = fixture(); source.tables.portfolio_items[0].tags = null;
  assert.equal(query(source, true, 'portfolio_items', { tags: 'not.cs.{雨}', category: 'eq.随笔' }).count, 1);
  source.tables.portfolio_items[0].title = 'a.b';
  assert.equal(query(source, true, 'portfolio_items', { title: 'ilike.a.b' }).count, 1);
  assert.equal(query(source, true, 'portfolio_items', { title: 'ilike.a_b' }).count, 1);
  const result = query(source, true, 'portfolio_items', { limit: '0' });
  assert.equal(result.rows.length, 0); assert.equal(result.count, 3);
  assert.throws(() => query(source, true, 'portfolio_items', { limit: '-1' }));
});
test('insert assigns ids and conservative publication defaults', () => {
  const document = fixture();
  const rows = mutateContent(document, 'portfolio_items', 'POST', new URLSearchParams('select=id,is_visible,tags'), { title: '新文章' }, false);
  assert.match(rows[0].id, /^[a-f0-9-]{36}$/);
  assert.equal(rows[0].is_visible, false); assert.deepEqual(rows[0].tags, []);
  assert.equal(document.tables.portfolio_items.length, 4);
});
test('numeric ids and primary-key upserts preserve existing values', () => {
  const document = fixture(); document.tables.music_tracks = [{ id: 9, title: '旧歌曲' }];
  assert.equal(mutateContent(document, 'music_tracks', 'POST', new URLSearchParams('select=id'), { title: '新歌曲' }, false)[0].id, 10);
  mutateContent(document, 'site_config', 'POST', new URLSearchParams(), { key: 'signature', value: '新签名' }, true);
  assert.equal(document.tables.site_config.length, 1);
  assert.equal(document.tables.site_config[0].value, '新签名');
});
test('patches preserve unrelated fields; deletes require explicit filters', () => {
  const document = fixture();
  mutateContent(document, 'portfolio_items', 'PATCH', new URLSearchParams('id=eq.a'), { title: '改名' }, false);
  assert.equal(document.tables.portfolio_items[0].content, '一颗星');
  assert.equal(document.tables.portfolio_items[1].title, '乙');
  assert.throws(() => mutateContent(document, 'portfolio_items', 'DELETE', new URLSearchParams(), null, false));
  assert.throws(() => mutateContent(document, 'portfolio_items', 'PATCH', new URLSearchParams('id=eq.a'), { id: 'other' }, false));
  mutateContent(document, 'portfolio_items', 'DELETE', new URLSearchParams('id=in.(a,b)'), null, false);
  assert.deepEqual(document.tables.portfolio_items.map(row => row.id), ['c']);
});
test('foreign keys and referenced parents remain protected', () => {
  assert.throws(() => mutateContent(fixture(), 'characters', 'DELETE', new URLSearchParams('id=eq.char'), null, false));
  assert.throws(() => mutateContent(fixture(), 'gallery_images', 'POST', new URLSearchParams(), { album_id: 'missing', image_url: 'x' }, false));
});
test('album cascades remove only image records, and card deletion clears references', () => {
  const document = fixture();
  mutateContent(document, 'gallery_albums', 'DELETE', new URLSearchParams('id=eq.album'), null, false);
  assert.deepEqual(document.tables.gallery_images.map(row => row.id), ['secret']);
  mutateContent(document, 'theater_cards', 'DELETE', new URLSearchParams('id=eq.card'), null, false);
  assert.equal(document.tables.theater_records[0].card_id, null);
  assert.equal(document.tables.theater_records[0].content, '正文');
});
test('expired or changed preview modes cannot silently switch write destinations', () => {
  assert.equal(previewMatches('1', false), false);
  assert.equal(previewMatches('0', true), false);
  assert.equal(previewMatches('1', true), true);
  assert.equal(previewMatches('0', false), true);
  assert.equal(previewMatches(null, false), true);
});
test('required values and publication flag types are validated', () => {
  assert.throws(() => mutateContent(fixture(), 'portfolio_items', 'POST', new URLSearchParams(), {}, false));
  assert.throws(() => mutateContent(fixture(), 'portfolio_items', 'PATCH', new URLSearchParams('id=eq.a'), { is_visible: 'true' }, false));
});
test('private URL adaptation preserves public copies and external images', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  const old = 'https://example.supabase.co/storage/v1/object/public/theater-images/cover.jpg';
  const publicCopy = 'https://www.yuria.xin/images/legacy-media/cover.jpg';
  assert.equal(adaptPrivateMedia(old), '/api/notes/media?path=cover.jpg');
  assert.equal(adaptPrivateMedia(`<p><img src="${old}"></p>`), '<p><img src="/api/notes/media?path=cover.jpg"></p>');
  assert.equal(adaptPrivateMedia(publicCopy), publicCopy);
  assert.deepEqual(adaptPrivateMedia({ image_url: 'https://external.test/image.jpg' }), { image_url: 'https://external.test/image.jpg' });
});
test('official client query protocol supports search, joins, exact count and ranges', async () => {
  const document = fixture();
  const client = createClient('https://query.invalid', 'test', { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const url = new URL(String(input));
      const result = queryContent(document, true, tableName(url.pathname.split('/').pop()), url.searchParams);
      return Response.json(result.rows, { headers: { 'Content-Range': `${result.offset}-${result.offset + result.rows.length - 1}/${result.count}` } });
    } },
  });
  const result = await client.from('theater_records').select('id,title,characters(id,name)', { count: 'exact' })
    .or('title.ilike.%记录%,content.ilike.%记录%').order('title').range(0, 9);
  assert.equal(result.error, null); assert.equal(result.count, 1);
  assert.deepEqual(result.data[0].characters, { id: 'char', name: '角色' });
});
