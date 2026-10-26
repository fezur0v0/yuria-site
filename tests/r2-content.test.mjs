import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { decodeContent, visibleContent, searchContent, verifyBackupBytes, updateContent } from '../utils/migration/content.ts';
import { createHash } from 'node:crypto';

function fixture() {
  const tables = Object.fromEntries(CONTENT_TABLES.map(name => [name, []]));
  tables.portfolio_items = [{ id: 'public', title: '星星', content: '<p>公开正文</p>', is_visible: true },
    { id: 'draft', title: '私人星星', content: '隐藏正文', is_visible: false }];
  tables.gallery_albums = [{ id: 'visible', is_visible: true }, { id: 'hidden', is_visible: false },
    { id: 'locked', is_visible: true, is_locked: true }];
  tables.gallery_images = ['visible', 'hidden', 'locked'].map(album_id => ({ id: album_id, album_id }));
  tables.theater_cards = [{ id: 'private', title: '私人星星', content: '隐藏正文' }];
  tables.theater_records = [{ id: 'record', content: '隐藏正文' }];
  tables.characters = [{ id: 'character', name: '私人角色' }];
  tables.site_config = [{ key: 'signature', value: '公开签名' }, { key: 'theater_password', value: 'private' }];
  return { version: 1, tables };
}
const encode = document => new TextEncoder().encode(JSON.stringify(document));

test('guest filtering removes drafts, private records and images of hidden/locked albums', () => {
  const source = fixture();
  const guest = visibleContent(source, false);
  assert.deepEqual(guest.tables.portfolio_items.map(r => r.id), ['public']);
  assert.deepEqual(guest.tables.gallery_images.map(r => r.id), ['visible']);
  for (const name of ['theater_cards', 'theater_records', 'characters']) assert.equal(guest.tables[name].length, 0);
  assert.deepEqual(guest.tables.site_config.map(r => r.key), ['signature']);
  assert.equal(source.tables.portfolio_items.length, 2);
});
test('owner reads preserve all records and do not return shared mutable state', () => {
  const source = fixture();
  const owner = visibleContent(source, true);
  assert.deepEqual(owner, source);
  owner.tables.characters.length = 0;
  assert.equal(source.tables.characters.length, 1);
});
test('search applies authorization before matching private text', () => {
  assert.deepEqual(searchContent(fixture(), false, '隐藏正文'), []);
  assert.equal(searchContent(fixture(), false, '公开正文')[0].id, 'public');
  assert.equal(searchContent(fixture(), true, '隐藏正文').length, 3);
  assert.deepEqual(searchContent(fixture(), true, ' '), []);
});
test('content decoder rejects missing collections and duplicate primary keys', () => {
  assert.throws(() => decodeContent(encode({ version: 1, tables: {} })));
  const source = fixture();
  source.tables.characters.push({ id: 'character' });
  assert.throws(() => decodeContent(encode(source)));
  assert.deepEqual(decodeContent(encode(fixture())), fixture());
});
test('backup checksum and length must both match before use', () => {
  const bytes = encode(fixture());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  verifyBackupBytes(bytes, { bytes: bytes.length, sha256 });
  assert.throws(() => verifyBackupBytes(bytes, { bytes: bytes.length + 1, sha256 }));
  assert.throws(() => verifyBackupBytes(bytes, { bytes: bytes.length, sha256: 'wrong' }));
});
test('stale edits are rejected without writing', async () => {
  let writes = 0;
  const store = { async read() { return { bytes: encode(fixture()), etag: 'new' }; },
    async write() { writes++; return true; } };
  await assert.rejects(updateContent(store, 'old', doc => doc), /已更新/);
  assert.equal(writes, 0);
});
test('a concurrent save losing the atomic write fails visibly', async () => {
  const store = { async read() { return { bytes: encode(fixture()), etag: 'v1' }; },
    async write() { return false; } };
  await assert.rejects(updateContent(store, 'v1', doc => doc), /编辑冲突/);
});
test('valid edits use the expected version and preserve untouched collections', async () => {
  let saved;
  const store = { async read() { return { bytes: encode(fixture()), etag: 'v1' }; },
    async write(bytes, expected) { assert.equal(expected, 'v1'); saved = decodeContent(bytes); return true; } };
  await updateContent(store, 'v1', doc => { doc.tables.portfolio_items[0].title = '修改标题'; return doc; });
  assert.equal(saved.tables.portfolio_items[0].title, '修改标题');
  assert.equal(saved.tables.theater_cards.length, 1);
});
