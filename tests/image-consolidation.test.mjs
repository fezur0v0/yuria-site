import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { imageReferences, planImages, rewriteImageUrls, detectedImageType } from '../utils/migration/images.ts';
import { publicAddress } from '../utils/migration/imageNetwork.ts';
import { syncSiteAssets } from '../scripts/site-assets.mjs';

const options = { siteOrigin: 'https://www.yuria.xin', publicR2: 'https://public.r2.test', projectUrl: 'https://original.supabase.co',
  assets: { '/images/cover.jpg': 'https://public.r2.test/site-assets/hash/cover.jpg' } };
function fixture() {
  const tables = Object.fromEntries(CONTENT_TABLES.map(name => [name, []]));
  tables.portfolio_items = [
    { id: 'public', is_visible: true, cover_url: '/images/cover.jpg', content: '<img src="https://images.test/public.png">' },
    { id: 'draft', is_visible: false, content: '![private](https://images.test/private.png)' },
  ];
  tables.gallery_albums = [{ id: 'locked', is_visible: true, is_locked: true }];
  tables.gallery_images = [{ id: 'locked-image', album_id: 'locked', image_url: 'https://images.test/locked.png' }];
  tables.characters = [{ id: 'char', avatar: 'https://images.test/avatar.jpg' }];
  tables.music_tracks = [{ id: 'music', src: 'https://music.test/song.mp3', cover_url: 'https://images.test/album.jpg' }];
  tables.site_settings = [{ id: 'settings', links: { github: 'https://github.com/example' } }];
  return { version: 1, tables };
}
test('image plans distinguish published, draft, locked-album and private-character images', () => {
  const jobs = planImages(fixture(), options);
  const byUrl = new Map(jobs.map(job => [job.source, job]));
  assert.equal(byUrl.get('https://images.test/public.png').public, true);
  for (const url of ['private.png', 'locked.png', 'avatar.jpg']) assert.equal(byUrl.get(`https://images.test/${url}`).public, false);
  assert.equal(byUrl.get('/images/cover.jpg').destination, options.assets['/images/cover.jpg']);
  assert.equal(byUrl.has('https://music.test/song.mp3'), false);
  assert.equal(byUrl.has('https://github.com/example'), false);
});
test('all existing R2 routes and inline image data stay in place; legacy Supabase references use the copied file route', () => {
  const doc = fixture();
  doc.tables.portfolio_items = [{ id: 'p', is_visible: true, images: ['https://public.r2.test/gallery/a.jpg',
    '/api/content/media?bucket=gallery&path=a.jpg', '/api/content/image?key=hash.jpg', '/api/notes/media?path=a.jpg', 'data:image/png;base64,AAAA'],
    cover_url: 'https://original.supabase.co/storage/v1/object/sign/portfolio/cover.jpg?token=old' }];
  doc.tables.characters = []; doc.tables.gallery_images = []; doc.tables.music_tracks = [];
  const jobs = planImages(doc, options);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].destination, '/api/content/media?bucket=portfolio&path=cover.jpg');
});
test('rewriting only successful image mappings preserves failed URLs, original data and playback links', () => {
  const doc = fixture();
  const next = rewriteImageUrls(doc, new Map([['https://images.test/public.png', 'https://public.r2.test/content-images/hash.png']]));
  assert.ok(next.tables.portfolio_items[0].content.includes('https://public.r2.test/content-images/hash.png'));
  assert.ok(next.tables.portfolio_items[1].content.includes('https://images.test/private.png'));
  assert.equal(next.tables.music_tracks[0].src, 'https://music.test/song.mp3');
  assert.ok(doc.tables.portfolio_items[0].content.includes('https://images.test/public.png'));
});
test('HTML-escaped query strings and structured image arrays are collected, not ordinary links', () => {
  const doc = fixture();
  doc.tables.theater_records = [{ id: 'r', content: '<img src="https://images.test/x?a=1&amp;b=2">', images: [{ url: 'https://images.test/item.png', caption: 'not-an-image' }] }];
  const refs = imageReferences(doc);
  assert.ok(refs.includes('https://images.test/x?a=1&amp;b=2'));
  assert.ok(refs.includes('https://images.test/item.png'));
  assert.ok(!refs.includes('not-an-image'));
});
test('image magic rejects HTML and unsupported SVG responses even with image-like URLs', () => {
  assert.equal(detectedImageType(Buffer.from('89504e470d0a1a0a', 'hex')).extension, 'png');
  assert.equal(detectedImageType(Buffer.from('ffd8ffe0', 'hex')).extension, 'jpg');
  assert.equal(detectedImageType(Buffer.from('GIF89a')).extension, 'gif');
  assert.throws(() => detectedImageType(Buffer.from('<html>challenge</html>')));
  assert.throws(() => detectedImageType(Buffer.from('<svg onload="run()"/>')));
});
test('external downloads reject local, private, link-local, mapped and documentation addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '198.18.0.1', '203.0.113.1', '0.0.0.0', '224.0.0.1', '::1', '::ffff:127.0.0.1',
    'fc00::1', 'fe80::1', '2002:7f00:1::', '2001:db8::1', 'not-an-ip']) assert.equal(publicAddress(address), false, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111', '2001:4860:4860::8888']) assert.equal(publicAddress(address), true, address);
});
test('static asset upload is checksum verified and uses immutable content keys', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'yuria-assets-'));
  try {
    await mkdir(path.join(root, 'public/images'), { recursive: true }); await mkdir(path.join(root, 'app'));
    for (const file of ['public/images/cover.jpg', 'app/icon.png', 'app/favicon.ico']) await writeFile(path.join(root, file), file);
    const copies = new Map();
    const result = await syncSiteAssets(root, 'https://public.r2.test', {
      async put(key, bytes) { assert.ok(key.startsWith('site-assets/')); copies.set(key, bytes); },
      async get(key) { return copies.get(key); },
    });
    assert.equal(Object.keys(result.files).length, 3); assert.equal(copies.size, 3);
    const second = await syncSiteAssets(root, 'https://public.r2.test', null);
    assert.deepEqual(second, result);
    await assert.rejects(syncSiteAssets(root, 'https://public.r2.test', { async put() {}, async get() { return Buffer.from('corrupt'); } }), /checksum/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
