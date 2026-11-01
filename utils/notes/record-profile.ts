import { isValidTheaterObjectPath } from './media.ts';
export type RecordProfile = { name: string; bio: string; avatar: string; cover: string };
export const emptyRecordProfile: RecordProfile = { name: '', bio: '', avatar: '', cover: '' };
export const recordProfileKey = (characterId?: string) => characterId ? `airp_records_pair:${characterId}` : 'airp_records_profile';
export function parseRecordProfile(raw: unknown): RecordProfile {
  if (raw == null) return { ...emptyRecordProfile };
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('个人介绍格式无效');
  for (const [key, max] of [['name', 60], ['bio', 600], ['avatar', 2048], ['cover', 2048]] as const) {
    if (typeof value[key] !== 'string' || value[key].length > max) throw new Error('请检查文字长度或图片地址');
  }
  for (const key of ['avatar', 'cover'] as const) {
    if (!value[key]) continue;
    const url = new URL(value[key], 'https://private.local');
    if (!value[key].startsWith('/api/notes/media?') || !isValidTheaterObjectPath(url.searchParams.get('path') ?? '') || url.searchParams.size !== 1 || url.origin !== 'https://private.local' || url.pathname !== '/api/notes/media' || !url.searchParams.get('path') || url.hash) throw new Error('请使用私密图片上传');
  }
  return { name: value.name, bio: value.bio, avatar: value.avatar, cover: value.cover };
}
