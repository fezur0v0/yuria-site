import { CONTENT_TABLES, createVerifiedBackup, type BackupSource, type BackupTarget } from './backup.ts';
import { decodeContent, verifyBackupBytes } from './content.ts';
import { legacyMediaReferences } from './legacyMedia.ts';

export type CutoverState =
  | { version: 1; phase: 'idle' }
  | { version: 1; phase: 'preparing'; run: string; startedAt: string }
  | { version: 1; phase: 'active'; run: string; completedAt: string; prefix: string;
      contentKey: string; counts: Record<string, number>; files: number };
export const initialCutoverState: CutoverState = { version: 1, phase: 'idle' };

export function decodeCutoverState(bytes: Uint8Array): CutoverState {
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (value?.version !== 1) throw new Error('迁移状态无效');
  if (value.phase === 'idle') return initialCutoverState;
  if (!/^[a-zA-Z0-9_-]+$/.test(value.run ?? '')) throw new Error('迁移标识无效');
  if (value.phase === 'preparing' && Number.isFinite(Date.parse(value.startedAt))) return value;
  if (value.phase === 'active' && value.prefix === `migration-backups/${value.run}` &&
      value.contentKey === `content/live/runs/${value.run}/current.json` &&
      Number.isFinite(Date.parse(value.completedAt)) && Number.isSafeInteger(value.files) && value.files >= 0 &&
      CONTENT_TABLES.every(name => Number.isSafeInteger(value.counts?.[name]) && value.counts[name] >= 0)) return value;
  throw new Error('迁移状态无效');
}

export function contentEpoch(state: CutoverState) {
  return state.phase === 'active' ? `live-${state.run}` : 'supabase';
}
export function epochMatches(header: string | null, expected: string) {
  // Older pages may read but must reload before writing to the new live store.
  return header === expected || header === null && ['supabase', 'preview'].includes(expected);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(',')}}`;
  return JSON.stringify(value);
}

type Control = {
  acquire: () => Promise<void>;
  activate: (state: Extract<CutoverState, { phase: 'active' }>) => Promise<void>;
  abort: () => Promise<void>;
};

// The completion pointer is the only publication point. Preview data is never read.
export async function runFreshCutover(source: BackupSource, target: BackupTarget, control: Control, run: string, projectUrl?: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('迁移标识无效');
  await control.acquire();
  try {
    const prefix = `migration-backups/${run}`;
    const result = await createVerifiedBackup(source, target, prefix);
    const bytes = await target.get(`${prefix}/database.json`);
    const manifest = JSON.parse(new TextDecoder().decode(await target.get(`${prefix}/manifest.json`)));
    verifyBackupBytes(bytes, manifest.database);
    const document = decodeContent(bytes);
    if (bytes.length > 32 * 1024 * 1024) throw new Error('正式内容超过文件存储限制');
    for (const name of CONTENT_TABLES) {
      if (stable(await source.table(name)) !== stable(document.tables[name])) throw new Error('原网站内容在迁移中发生变化，请暂停编辑后重试');
    }
    const entries = await source.files();
    const paths = entries.map(file => `${file.bucket}/${file.path}`).sort();
    const savedPaths = manifest.files.map((file: { source: { bucket: string; path: string } }) => `${file.source.bucket}/${file.source.path}`).sort();
    if (stable(paths) !== stable(savedPaths)) throw new Error('原图片列表在迁移中发生变化，请暂停上传后重试');
    const available = new Set(paths);
    if (legacyMediaReferences(document, projectUrl).some(media => !available.has(`${media.bucket}/${media.path}`))) {
      throw new Error('存在未找到原文件的图片引用，请检查原网站图片');
    }
    for (const file of manifest.files) {
      const original = await source.download(file.source);
      verifyBackupBytes(original.bytes, file);
    }
    const contentKey = `content/live/runs/${run}/current.json`;
    await target.put(contentKey, bytes, 'application/json');
    verifyBackupBytes(await target.get(contentKey), manifest.database);
    const state: Extract<CutoverState, { phase: 'active' }> = {
      version: 1, phase: 'active', run, completedAt: new Date().toISOString(), prefix,
      contentKey, counts: result.counts, files: result.files,
    };
    await control.activate(state);
    return state;
  } catch (error) {
    // A lost publish response may already have committed; abort must never undo it.
    await control.abort();
    throw error;
  }
}
