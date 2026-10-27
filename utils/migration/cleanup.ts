import { CONTENT_TABLES, backupObjectKey, type BackupSource } from './backup.ts';
import { decodeContent, verifyBackupBytes, type ContentTables } from './content.ts';

export const CLEANUP_ORDER = ['gallery_images', 'theater_records', 'gallery_albums', 'theater_cards',
  'characters', 'portfolio_items', 'music_tracks', 'intro_lines', 'hero_lines', 'site_settings', 'site_config'] as const;
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

// Retries may see already removed rows/files. Changed or newly added source data is never deleted.
export async function verifyCleanup(source: BackupSource, read: (key: string) => Promise<Uint8Array>, prefix: string) {
  if (!/^migration-backups\/[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error('正式备份目录无效');
  const manifest = JSON.parse(new TextDecoder().decode(await read(`${prefix}/manifest.json`)));
  if (manifest?.version !== 1 || manifest.database?.key !== `${prefix}/database.json` || !Array.isArray(manifest.files)) {
    throw new Error('正式备份完成标记无效');
  }
  const bytes = await read(manifest.database.key);
  verifyBackupBytes(bytes, manifest.database);
  const backup = decodeContent(bytes);
  const current = {} as ContentTables;
  for (const name of CONTENT_TABLES) {
    if (manifest.counts?.[name] !== backup.tables[name].length) throw new Error('备份记录数量不一致');
    const key = name === 'site_config' ? 'key' : 'id';
    const saved = new Map(backup.tables[name].map(row => [canonical(row[key]), canonical(row)]));
    current[name] = await source.table(name) as ContentTables[typeof name];
    if (current[name].some(row => saved.get(canonical(row[key])) !== canonical(row))) {
      throw new Error('Supabase 中存在新增或修改的内容，请先重新备份，尚未执行本次删除');
    }
  }
  const savedFiles = new Map<string, { bytes: number; sha256: string }>();
  for (const file of manifest.files) {
    const key = backupObjectKey(prefix, file.source?.bucket, file.source?.path);
    if (file.key !== key || savedFiles.has(key) || !Number.isSafeInteger(file.bytes) ||
        file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('备份图片清单无效');
    verifyBackupBytes(await read(key), file);
    savedFiles.set(key, file);
  }
  const files = await source.files();
  for (const file of files) {
    const saved = savedFiles.get(backupObjectKey(prefix, file.bucket, file.path));
    if (!saved) throw new Error('存在未备份的 Supabase 图片，尚未执行本次删除');
    verifyBackupBytes((await source.download(file)).bytes, saved);
  }
  return { tables: current, files, rows: CONTENT_TABLES.reduce((sum, name) => sum + current[name].length, 0) };
}
