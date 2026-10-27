import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function syncSiteAssets(root, baseUrl, target) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Invalid public asset base URL');
  const files = {};
  async function add(file, source) {
    const bytes = await readFile(path.join(root, file));
    const hash = sha(bytes);
    const key = `site-assets/${hash}/${path.basename(file)}`;
    if (target) {
      await target.put(key, bytes, types[path.extname(file)]);
      if (sha(await target.get(key)) !== hash) throw new Error('Site asset checksum mismatch');
    }
    files[source] = { key, sha256: hash, bytes: bytes.length, type: types[path.extname(file)] };
  }
  async function walk(directory) {
    for (const entry of (await readdir(path.join(root, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(relative);
      else if (entry.isFile() && types[path.extname(entry.name)]) await add(relative, `/${relative.slice('public/'.length)}`);
    }
  }
  await walk('public');
  await add('app/icon.png', '/icon.png');
  await add('app/favicon.ico', '/favicon.ico');
  return { baseUrl: base.href.replace(/\/$/, ''), files };
}
async function main() {
  const root = process.cwd();
  const previous = JSON.parse(await readFile(path.join(root, 'generated/site-assets.json'), 'utf8'));
  const keys = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  const configured = keys.every(key => process.env[key]);
  if (process.env.VERCEL && !configured) throw new Error('R2 is required for deployed site assets');
  if (process.env.R2_BUCKET_NAME && process.env.R2_BUCKET_NAME === process.env.R2_PRIVATE_BUCKET_NAME) throw new Error('Site assets require the public bucket');
  const client = configured ? new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }) : null;
  const manifest = await syncSiteAssets(root, process.env.R2_PUBLIC_URL ?? previous.baseUrl, client ? {
    async put(key, bytes, type) {
      try { await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key,
        Body: bytes, ContentType: type, CacheControl: 'public, max-age=31536000, immutable', IfNoneMatch: '*' })); }
      catch (error) { if (error?.$metadata?.httpStatusCode !== 412) throw error; }
    },
    async get(key) {
      const object = await client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
      if (!object.Body) throw new Error('Unable to read site asset');
      return object.Body.transformToByteArray();
    },
  } : null);
  await writeFile(path.join(root, 'generated/site-assets.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${Object.keys(manifest.files).length} site assets ${client ? 'copied to R2 and checksum verified' : 'indexed; local build without upload credentials'}.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
