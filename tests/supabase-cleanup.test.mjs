import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_TABLES, createVerifiedBackup } from '../utils/migration/backup.ts';
import { verifyCleanup } from '../utils/migration/cleanup.ts';

async function fixture() {
  const rows = Object.fromEntries(CONTENT_TABLES.map(name => [name, [{ [name === 'site_config' ? 'key' : 'id']: name, content: 'original' }]]));
  let files = [{ bucket: 'gallery', path: 'original.jpg' }];
  let bytes = new Uint8Array([1, 2, 3]);
  const objects = new Map();
  const source = { async table(name) { return rows[name]; }, async files() { return files; },
    async download() { return { bytes, type: 'image/jpeg' }; } };
  const target = { async put(key, bytes) { objects.set(key, bytes.slice()); }, async get(key) { return objects.get(key); } };
  await createVerifiedBackup(source, target, 'migration-backups/test');
  return { rows, objects, source, target, changeFile(value) { bytes = value; }, removeFiles() { files = []; } };
}

test('cleanup verifies all original rows and bytes and accepts a partially completed retry', async () => {
  const f = await fixture();
  const plan = await verifyCleanup(f.source, f.target.get, 'migration-backups/test');
  assert.equal(plan.rows, 11); assert.equal(plan.files.length, 1);
  f.rows.gallery_images = []; f.removeFiles();
  const retry = await verifyCleanup(f.source, f.target.get, 'migration-backups/test');
  assert.equal(retry.rows, 10); assert.equal(retry.files.length, 0);
});
test('new or changed source content blocks cleanup', async () => {
  const f = await fixture();
  f.rows.portfolio_items[0].content = 'new text must survive';
  await assert.rejects(verifyCleanup(f.source, f.target.get, 'migration-backups/test'), /新增或修改/);
});
test('corrupt R2 data blocks cleanup even when the source files are already gone', async () => {
  const f = await fixture(); f.removeFiles();
  f.objects.set('migration-backups/test/storage/gallery/original.jpg', new Uint8Array([0]));
  await assert.rejects(verifyCleanup(f.source, f.target.get, 'migration-backups/test'), /校验失败/);
});
test('changed original file bytes block cleanup', async () => {
  const f = await fixture(); f.changeFile(new Uint8Array([4, 5, 6]));
  await assert.rejects(verifyCleanup(f.source, f.target.get, 'migration-backups/test'), /校验失败/);
});
test('backup database checksum mismatch blocks cleanup', async () => {
  const f = await fixture(); f.objects.set('migration-backups/test/database.json', new Uint8Array([0]));
  await assert.rejects(verifyCleanup(f.source, f.target.get, 'migration-backups/test'), /校验失败/);
});
