import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_TABLES, privateBucketName, backupObjectKey, createVerifiedBackup } from '../utils/migration/backup.ts';

test('private destination cannot be missing or reuse the public bucket', () => {
  for (const name of [undefined, '', ' yuria ']) assert.throws(() => privateBucketName(name, 'yuria'));
  assert.equal(privateBucketName(' yuria-private ', 'yuria'), 'yuria-private');
});

test('backup paths keep source buckets separate and reject traversal', () => {
  const prefix = 'migration-backups/test';
  assert.equal(backupObjectKey(prefix, 'gallery', 'folder/图片.jpg'), `${prefix}/storage/gallery/folder/图片.jpg`);
  for (const path of ['../file', '/file', 'a//b', 'a/./b', 'a\\b', 'a\0b']) {
    assert.throws(() => backupObjectKey(prefix, 'gallery', path));
  }
  assert.throws(() => backupObjectKey(prefix, 'unknown', 'file'));
});

function fixture(corrupt = false, failDownload = false) {
  const objects = new Map();
  const bytes = new TextEncoder().encode('original image bytes');
  const source = {
    async table(name) { return [{ id: name, content: '保留原文与原图片引用' }]; },
    async files() { return [{ bucket: 'theater-images', path: 'cover.jpg' }]; },
    async download() {
      if (failDownload) throw new Error('source download failed');
      return { bytes, type: 'image/jpeg' };
    },
  };
  const target = {
    async put(key, value) { objects.set(key, value.slice()); },
    async get(key) { return corrupt ? new Uint8Array([0]) : objects.get(key); },
  };
  return { objects, source, target, bytes };
}

test('only complete verified copies produce a final manifest', async () => {
  const { source, target, objects, bytes } = fixture();
  const result = await createVerifiedBackup(source, target, 'migration-backups/test');
  assert.equal(result.files, 1);
  assert.deepEqual(Object.keys(result.counts), [...CONTENT_TABLES]);
  const manifest = JSON.parse(new TextDecoder().decode(objects.get('migration-backups/test/manifest.json')));
  assert.equal(manifest.files[0].bytes, bytes.length);
  assert.match(manifest.files[0].sha256, /^[a-f0-9]{64}$/);
  const database = JSON.parse(new TextDecoder().decode(objects.get(manifest.database.key)));
  assert.equal(database.tables.portfolio_items[0].content, '保留原文与原图片引用');
  assert.equal(database.tables.access_config, undefined);
});

test('corrupt read-back fails closed without a completion manifest', async () => {
  const { source, target, objects } = fixture(true);
  await assert.rejects(createVerifiedBackup(source, target, 'migration-backups/corrupt'), /校验失败/);
  assert.equal(objects.has('migration-backups/corrupt/manifest.json'), false);
});

test('source image failure leaves no completion manifest', async () => {
  const { source, target, objects } = fixture(false, true);
  await assert.rejects(createVerifiedBackup(source, target, 'migration-backups/partial'), /download failed/);
  assert.equal(objects.has('migration-backups/partial/manifest.json'), false);
});

test('invalid destination prefixes are rejected before any export', async () => {
  const { source, target, objects } = fixture();
  await assert.rejects(createVerifiedBackup(source, target, 'public/export'));
  assert.equal(objects.size, 0);
});
