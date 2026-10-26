import { privateTheaterMediaUrl } from '../notes/media.ts';

// Adapt old private Supabase links only at the presentation boundary. Original
// backup values remain intact; public website assets and external hosts stay put.
export function adaptPrivateMedia(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/https?:\/\/[^\s<>"']+/g, source => privateTheaterMediaUrl(source));
  }
  if (Array.isArray(value)) return value.map(adaptPrivateMedia);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, adaptPrivateMedia(entry)]));
  return value;
}
