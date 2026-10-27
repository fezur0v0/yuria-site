import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { contentEpoch, decodeCutoverState, epochMatches, runFreshCutover } from '../utils/migration/cutover.ts';
import { adaptImportedMedia, legacyMedia, legacyMediaReferences } from '../utils/migration/legacyMedia.ts';
import { visibleContent } from '../utils/migration/content.ts';

const project = 'https://original.supabase.co';
const originalUrl = `${project}/storage/v1/object/public/theater-images/private.jpg`;
function fixture() {
  const tables = Object.fromEntries(CONTENT_TABLES.map(name => [name, []]));
  tables.portfolio_items = [{ id: 'original', title: '正式原文', content: '<p>正文</p>', is_visible: true }];
  tables.characters = [{ id: 'private', avatar_url: originalUrl }];
  const objects = new Map([['content/preview/current.json', new TextEncoder().encode('测试标题与新增测试图')]]);
  const source = {
    async table(name) { return structuredClone(tables[name]); },
    async files() { return [{ bucket: 'theater-images', path: 'private.jpg' }]; },
    async download() { return { bytes: new TextEncoder().encode('source image'), type: 'image/jpeg' }; },
  };
  const target = {
    async put(key, bytes) { assert.equal(objects.has(key), false); objects.set(key, bytes.slice()); },
    async get(key) { assert.ok(objects.has(key), key); return objects.get(key).slice(); },
  };
  let state = { version: 1, phase: 'idle' };
  const events = [];
  const control = {
    async acquire() { assert.equal(state.phase, 'idle'); events.push('pause'); state = { phase: 'preparing' }; },
    async activate(next) { assert.ok(objects.has(next.contentKey)); events.push('activate'); state = next; },
    async abort() { events.push('abort'); if (state.phase === 'preparing') state = { version: 1, phase: 'idle' }; },
  };
  return { tables, source, target, objects, control, events, state: () => state };
}

test('fresh cutover publishes current originals, leaves preview intact, and pauses before copying', async () => {
  const f = fixture();
  const preview = f.objects.get('content/preview/current.json').slice();
  const result = await runFreshCutover(f.source, f.target, f.control, 'fresh', project);
  assert.deepEqual(f.events, ['pause', 'activate']);
  assert.equal(result.phase, 'active');
  const live = JSON.parse(new TextDecoder().decode(f.objects.get(result.contentKey)));
  assert.equal(live.tables.portfolio_items[0].title, '正式原文');
  assert.equal(live.tables.characters[0].avatar_url, originalUrl);
  assert.deepEqual(f.objects.get('content/preview/current.json'), preview);
  assert.equal(f.state().prefix, 'migration-backups/fresh');
  assert.equal(f.tables.portfolio_items[0].title, '正式原文');
});
test('source table drift aborts publication and restores the original backend', async () => {
  const f = fixture(); let reads = 0;
  const table = f.source.table;
  f.source.table = async name => {
    const rows = await table(name);
    if (name === 'portfolio_items' && ++reads > 1) rows[0].title = '其他页面刚更新';
    return rows;
  };
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'drift', project), /发生变化/);
  assert.equal(f.state().phase, 'idle');
  assert.equal(f.objects.has('content/live/runs/drift/current.json'), false);
});
test('source image changes after backup cannot be published', async () => {
  const f = fixture(); let downloads = 0;
  const download = f.source.download;
  f.source.download = async () => ++downloads === 1 ? download() : { bytes: new Uint8Array([42]), type: 'image/jpeg' };
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'media-drift', project), /校验失败/);
  assert.equal(f.state().phase, 'idle');
});
test('new or removed source objects abort the switch', async () => {
  const f = fixture(); let calls = 0; const files = f.source.files;
  f.source.files = async () => ++calls === 1 ? files() : [];
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'files-drift', project), /列表.*变化/);
  assert.equal(f.state().phase, 'idle');
});
test('missing referenced images are detected even if existing objects copied correctly', async () => {
  const f = fixture(); f.tables.characters[0].avatar_url = `${project}/storage/v1/object/public/theater-images/missing.jpg`;
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'missing-ref', project), /未找到原文件/);
  assert.equal(f.state().phase, 'idle');
});
test('a corrupt live document cannot flip the completion pointer', async () => {
  const f = fixture(); const get = f.target.get;
  f.target.get = async key => key.startsWith('content/live/') ? new Uint8Array([0]) : get(key);
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'corrupt', project), /校验失败/);
  assert.equal(f.events.includes('activate'), false);
});
test('a competing migration that cannot acquire the lease cannot copy anything', async () => {
  const f = fixture(); f.control.acquire = async () => { throw new Error('lease conflict'); };
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'race', project), /lease conflict/);
  assert.equal(f.objects.size, 1);
  assert.equal(f.events.includes('abort'), false);
});
test('an uncertain activation response never reverts an already active store', async () => {
  const f = fixture(); const activate = f.control.activate;
  f.control.activate = async state => { await activate(state); throw new Error('response lost'); };
  await assert.rejects(runFreshCutover(f.source, f.target, f.control, 'lost-response', project), /response lost/);
  assert.equal(f.state().phase, 'active');
});
test('cutover markers reject paths outside their unique run, and stale clients must reload', async () => {
  const f = fixture(); const state = await runFreshCutover(f.source, f.target, f.control, 'marker', project);
  const encode = x => new TextEncoder().encode(JSON.stringify(x));
  assert.deepEqual(decodeCutoverState(encode(state)), state);
  assert.throws(() => decodeCutoverState(encode({ ...state, contentKey: 'content/preview/current.json' })));
  assert.throws(() => decodeCutoverState(encode({ ...state, prefix: 'migration-backups/other' })));
  assert.throws(() => decodeCutoverState(encode({ ...state, run: '../private' })));
  assert.equal(epochMatches(null, contentEpoch(state)), false);
  assert.equal(epochMatches('supabase', contentEpoch(state)), false);
  assert.equal(epochMatches(contentEpoch(state), contentEpoch(state)), true);
  assert.equal(epochMatches(null, 'supabase'), true);
});
test('legacy media adapts all original buckets, including signed URLs, without touching external assets', () => {
  for (const bucket of ['portfolio', 'gallery', 'theater-images']) {
    const url = `${project}/storage/v1/object/sign/${bucket}/folder/%E5%9B%BE.jpg?token=expired`;
    assert.deepEqual(legacyMedia(url, project), { bucket, path: 'folder/图.jpg' });
    assert.equal(adaptImportedMedia(url, project), `/api/content/media?bucket=${bucket}&path=folder%2F%E5%9B%BE.jpg`);
  }
  for (const url of ['/images/legacy-media/cover.jpg', 'https://external.test/image.jpg']) assert.equal(adaptImportedMedia(url, project), url);
  for (const path of ['%2e%2e%2fsecret.jpg', 'a%2f%2fb.jpg', '%00.jpg']) {
    assert.equal(legacyMedia(`${project}/storage/v1/object/public/gallery/${path}`, project), null);
  }
});
test('guest media authorization follows publication and locked albums, including saved adapted URLs', () => {
  const f = fixture();
  f.tables.gallery_albums = [{ id: 'public', is_visible: true }, { id: 'locked', is_visible: true, is_locked: true }];
  f.tables.gallery_images = [
    { id: 'one', album_id: 'public', url: `${project}/storage/v1/object/public/gallery/open.jpg` },
    { id: 'two', album_id: 'locked', url: `${project}/storage/v1/object/public/gallery/secret.jpg` },
  ];
  const doc = { version: 1, tables: f.tables };
  const publicRefs = legacyMediaReferences(visibleContent(doc, false), project);
  assert.deepEqual(publicRefs, [{ bucket: 'gallery', path: 'open.jpg' }]);
  const savedByEditor = adaptImportedMedia(doc, project);
  assert.deepEqual(legacyMediaReferences(visibleContent(savedByEditor, false), project), publicRefs);
  assert.equal(legacyMediaReferences(savedByEditor, project).length, 3);
});
