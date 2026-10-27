// Runs the built Next.js app against local Supabase/S3 fixtures, without real credentials.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const tables = Object.fromEntries(['site_config', 'site_settings', 'hero_lines', 'intro_lines', 'music_tracks',
  'portfolio_items', 'gallery_albums', 'gallery_images', 'theater_cards', 'theater_records', 'characters'].map(name => [name, []]));
const objects = new Map();
const image = Buffer.from('fixture-image');
let fixtureOrigin;
let sourceWrites = 0;
function json(response, data, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data));
}
const fixture = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://fixture.invalid');
  const path = decodeURIComponent(url.pathname);
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  if (path === '/auth/v1/user') return json(response, user);
  if (path.startsWith('/rest/v1/')) {
    if (request.method !== 'GET') sourceWrites++;
    return json(response, tables[path.split('/').pop()] ?? []);
  }
  if (path.startsWith('/storage/v1/object/list/')) {
    const bucket = path.split('/').pop();
    return json(response, ['gallery', 'theater-images'].includes(bucket) ? [{ id: bucket, name: 'image.jpg' }] : []);
  }
  if (path.startsWith('/storage/v1/object/')) {
    response.writeHead(200, { 'Content-Type': 'image/jpeg' }); return response.end(image);
  }
  if (path.startsWith('/private-fixture/')) {
    const key = path.slice('/private-fixture/'.length);
    const saved = objects.get(key);
    const failure = (code, status) => {
      response.writeHead(status, { 'Content-Type': 'application/xml' }); response.end(`<Error><Code>${code}</Code></Error>`);
    };
    if (request.method === 'GET') {
      if (!saved) return failure('NoSuchKey', 404);
      response.writeHead(200, { ETag: saved.etag, 'Content-Type': saved.type, 'Content-Length': saved.bytes.length });
      return response.end(saved.bytes);
    }
    if (request.method === 'PUT') {
      if (request.headers['if-none-match'] === '*' && saved || request.headers['if-match'] && request.headers['if-match'] !== saved?.etag) {
        return failure('PreconditionFailed', 412);
      }
      const etag = `"${createHash('md5').update(bytes).digest('hex')}"`;
      objects.set(key, { bytes, etag, type: request.headers['content-type'] ?? 'application/octet-stream' });
      response.writeHead(200, { ETag: etag, 'Content-Length': 0 }); return response.end();
    }
  }
  json(response, { error: 'unexpected fixture request', path }, 404);
});
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'fixture@example.invalid', identities: [{ provider: 'github', identity_data: { provider_id: 'fixture-owner' } }] };
await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
fixtureOrigin = `http://127.0.0.1:${fixture.address().port}`;
tables.portfolio_items = [{ id: 'original', title: 'Original title', category: null, content: '<p>Original body</p>', cover_url: null, is_visible: true },
  { id: 'draft', title: 'Hidden draft', content: 'private', is_visible: false }];
tables.gallery_albums = [{ id: 'album', title: 'Album', is_visible: true, is_locked: false }];
tables.gallery_images = [{ id: 'image', album_id: 'album', image_url: `${fixtureOrigin}/storage/v1/object/public/gallery/image.jpg` }];
tables.characters = [{ id: 'character', name: 'Private character', avatar: `${fixtureOrigin}/storage/v1/object/public/theater-images/image.jpg` }];
const preview = Buffer.from(JSON.stringify({ version: 1, tables: { ...tables,
  portfolio_items: [{ ...tables.portfolio_items[0], title: 'Never publish this test title' }] } }));
objects.set('content/preview/current.json', { bytes: preview, etag: '"preview"', type: 'application/json' });
const exp = Math.floor(Date.now() / 1000) + 3600;
const accessToken = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' })).toString('base64url'), 'fixture-signature'].join('.');
const session = { access_token: accessToken, refresh_token: 'fixture-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user };
const cookie = `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
const reserve = createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
const origin = `http://localhost:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: fixtureOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon',
    OWNER_GITHUB_ID: 'fixture-owner', R2_ENDPOINT: fixtureOrigin, R2_BUCKET_NAME: 'public-fixture',
    R2_PRIVATE_BUCKET_NAME: 'private-fixture', R2_PUBLIC_URL: `${fixtureOrigin}/public-fixture`,
    R2_ACCESS_KEY_ID: 'fixture-access-key', R2_SECRET_ACCESS_KEY: 'fixture-secret-key', CONTENT_BACKEND: '', R2_CONTENT_BACKUP_PREFIX: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = ''; child.stdout.on('data', b => { output = (output + b).slice(-5000); }); child.stderr.on('data', b => { output = (output + b).slice(-5000); });
async function request(path, options = {}, owner = false) {
  const headers = new Headers(options.headers);
  if (owner) { headers.set('Cookie', cookie); headers.set('Authorization', `Bearer ${accessToken}`); }
  if (options.method && options.method !== 'GET') headers.set('Origin', origin);
  return fetch(origin + path, { ...options, headers, signal: AbortSignal.timeout(30000) });
}
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { const response = await fetch(origin + '/api/admin/content-preview', { signal: AbortSignal.timeout(500) }); if (response.ok) break; } catch { /* starting */ }
    if (attempt === 39) throw new Error(`Next.js failed to start: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal((await request('/api/admin/storage-cutover')).status, 403);
  const before = await request('/api/admin/storage-cutover', {}, true); assert.equal(before.status, 200);
  assert.equal((await before.json()).state.phase, 'idle');
  const activation = await request('/api/admin/storage-cutover', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'activate-fresh' }) }, true);
  const result = await activation.json();
  assert.equal(activation.status, 200, JSON.stringify(result)); assert.equal(result.state.phase, 'active');
  const mode = await (await request('/api/admin/content-preview', {}, true)).json();
  assert.equal(mode.live, true); assert.equal(mode.preview, false);
  const publicRead = await request('/api/content/portfolio_items?select=id,title');
  assert.deepEqual(await publicRead.json(), [{ id: 'original', title: 'Original title' }]);
  const ownerRead = await request('/api/content/portfolio_items?select=id,title', {}, true);
  const version = ownerRead.headers.get('X-Yuria-Table-Version'); assert.ok(version);
  assert.equal((await ownerRead.json()).length, 2);
  const patch = { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Yuria-Table-Version': version }, body: JSON.stringify({ title: 'Saved in R2' }) };
  assert.equal((await request('/api/content/portfolio_items?id=eq.original', patch, true)).status, 409);
  patch.headers['X-Yuria-Content-Epoch'] = mode.epoch;
  assert.equal((await request('/api/content/portfolio_items?id=eq.original', patch, true)).status, 204);
  const publicAfter = await (await request('/api/content/portfolio_items?select=title')).json();
  assert.equal(publicAfter[0].title, 'Saved in R2');
  assert.equal(tables.portfolio_items[0].title, 'Original title'); assert.equal(sourceWrites, 0);
  const media = await request('/api/content/media?bucket=gallery&path=image.jpg');
  assert.equal(media.status, 200); assert.deepEqual(Buffer.from(await media.arrayBuffer()), image);
  assert.equal((await request('/api/content/media?bucket=theater-images&path=image.jpg')).status, 404);
  assert.equal((await request('/api/notes/media?path=image.jpg')).status, 403);
  assert.equal((await request('/api/notes/media?path=image.jpg', {}, true)).status, 200);
  assert.equal((await request('/api/admin/image-consolidation')).status, 403);
  const imagePlan = await (await request('/api/admin/image-consolidation', {}, true)).json();
  assert.equal(imagePlan.remaining, 2);
  const consolidate = await request('/api/admin/image-consolidation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'consolidate' }) }, true);
  const consolidated = await consolidate.json();
  assert.equal(consolidate.status, 200, JSON.stringify(consolidated));
  assert.equal(consolidated.complete, true); assert.equal(consolidated.updated, 2);
  const privateFile = '0'.repeat(64) + '.jpg';
  assert.equal((await request(`/api/content/image?key=${privateFile}`)).status, 403);
  objects.set(`content/live/imported/${privateFile}`, { bytes: image, etag: '"private-import"', type: 'image/jpeg' });
  assert.equal((await request(`/api/content/image?key=${privateFile}`, {}, true)).status, 200);
  const articleVersion = (await request('/api/content/portfolio_items?select=id', {}, true)).headers.get('X-Yuria-Table-Version');
  const publishRef = await request('/api/content/portfolio_items?id=eq.original', { method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Yuria-Content-Epoch': mode.epoch, 'X-Yuria-Table-Version': articleVersion },
    body: JSON.stringify({ cover_url: `/api/content/image?key=${privateFile}` }) }, true);
  assert.equal(publishRef.status, 204);
  assert.equal((await request(`/api/content/image?key=${privateFile}`)).status, 200);
  const article = await (await request('/portfolio/original')).text(); assert.ok(article.includes('Saved in R2')); assert.ok(article.includes('Original body'));
  const sitemap = await (await request('/sitemap.xml')).text(); assert.ok(sitemap.includes('/portfolio/original')); assert.ok(!sitemap.includes('/portfolio/draft'));
  assert.deepEqual(objects.get('content/preview/current.json').bytes, preview);
  console.log('HTTP cutover and image consolidation verified: owner activation, R2 editing, stale editors, public/private media, reference rewrites, detail rendering and sitemap.');
} catch (error) { console.error(output); throw error; }
finally { child.kill('SIGTERM'); fixture.closeAllConnections(); await new Promise(resolve => fixture.close(resolve)); }
