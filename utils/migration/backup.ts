import { createHash } from 'node:crypto';

// Auth users and obsolete password hashes are deliberately not content exports.
export const CONTENT_TABLES = [
  'site_config', 'site_settings', 'hero_lines', 'intro_lines', 'music_tracks',
  'portfolio_items', 'gallery_albums', 'gallery_images',
  'theater_cards', 'theater_records', 'characters',
] as const;
export const MEDIA_BUCKETS = ['portfolio', 'gallery', 'theater-images'] as const;

export function privateBucketName(value: string | undefined, publicBucket: string) {
  const bucket = value?.trim();
  if (!bucket || bucket === publicBucket) throw new Error('请配置独立的 R2_PRIVATE_BUCKET_NAME，不能使用公开素材桶');
  return bucket;
}

export function backupObjectKey(prefix: string, bucket: string, path: string) {
  if (!(MEDIA_BUCKETS as readonly string[]).includes(bucket) ||
      !path || /[\\\u0000-\u001f\u007f]/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('备份图片路径无效');
  }
  return `${prefix}/storage/${bucket}/${path}`;
}

type FileEntry = { bucket: string; path: string };
type Source = {
  table: (name: typeof CONTENT_TABLES[number]) => Promise<unknown[]>;
  files: () => Promise<FileEntry[]>;
  download: (file: FileEntry) => Promise<{ bytes: Uint8Array; type: string }>;
};
type Target = {
  put: (key: string, bytes: Uint8Array, type: string) => Promise<void>;
  get: (key: string) => Promise<Uint8Array>;
};
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

export async function createVerifiedBackup(source: Source, target: Target, prefix: string) {
  if (!/^migration-backups\/[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error('备份前缀无效');
  async function copy(key: string, bytes: Uint8Array, type: string) {
    const sha256 = digest(bytes);
    await target.put(key, bytes, type);
    const saved = await target.get(key);
    if (saved.byteLength !== bytes.byteLength || digest(saved) !== sha256) {
      throw new Error('R2 副本校验失败；原数据保留，请重新运行备份');
    }
    return { key, bytes: bytes.byteLength, sha256 };
  }

  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const table of CONTENT_TABLES) {
    tables[table] = await source.table(table);
    counts[table] = tables[table].length;
  }
  const database = await copy(`${prefix}/database.json`, jsonBytes({ version: 1, tables }), 'application/json');
  const files = [];
  for (const file of await source.files()) {
    const key = backupObjectKey(prefix, file.bucket, file.path);
    const { bytes, type } = await source.download(file);
    files.push({ source: file, ...await copy(key, bytes, type) });
  }
  // Only a verified manifest marks a backup as complete. Partial runs never switch readers.
  const manifest = { version: 1, completedAt: new Date().toISOString(), counts, database, files };
  await copy(`${prefix}/manifest.json`, jsonBytes(manifest), 'application/json');
  return { prefix, counts, files: files.length, bytes: database.bytes + files.reduce((n, file) => n + file.bytes, 0) };
}
