import { MEDIA_BUCKETS, backupObjectKey } from './backup.ts';

export type LegacyMedia = { bucket: typeof MEDIA_BUCKETS[number]; path: string };
export function legacyMedia(source: string, projectUrl: string | undefined): LegacyMedia | null {
  if (!projectUrl) return null;
  try {
    const url = new URL(source.replaceAll('&amp;', '&'));
    if (url.origin !== new URL(projectUrl).origin) return null;
    for (const bucket of MEDIA_BUCKETS) for (const mode of ['public', 'sign', 'authenticated']) {
      const prefix = `/storage/v1/object/${mode}/${bucket}/`;
      if (!url.pathname.startsWith(prefix)) continue;
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      backupObjectKey('migration-backups/check', bucket, path);
      return path.length <= 1024 ? { bucket, path } : null;
    }
  } catch { /* Non-storage and malformed URLs are not resolved. */ }
  return null;
}
export function legacyMediaReferences(value: unknown, projectUrl: string | undefined): LegacyMedia[] {
  const found = new Map<string, LegacyMedia>();
  function visit(entry: unknown) {
    if (typeof entry === 'string') {
      for (const match of entry.matchAll(/https?:\/\/[^\s<>"']+/g)) {
        const media = legacyMedia(match[0], projectUrl);
        if (media) found.set(`${media.bucket}/${media.path}`, media);
      }
      for (const match of entry.matchAll(/\/api\/notes\/media\?path=([^\s<>"'&]+)/g)) {
        try {
          const path = decodeURIComponent(match[1]);
          backupObjectKey('migration-backups/check', 'theater-images', path);
          found.set(`theater-images/${path}`, { bucket: 'theater-images', path });
        } catch { /* Do not resolve malformed paths. */ }
      }
      for (const match of entry.matchAll(/\/api\/content\/media\?[^\s<>"']+/g)) {
        try {
          const url = new URL(match[0].replaceAll('&amp;', '&'), 'https://content.invalid');
          const bucket = url.searchParams.get('bucket') ?? '';
          const path = url.searchParams.get('path') ?? '';
          backupObjectKey('migration-backups/check', bucket, path);
          found.set(`${bucket}/${path}`, { bucket: bucket as LegacyMedia['bucket'], path });
        } catch { /* Do not resolve malformed paths. */ }
      }
    } else if (Array.isArray(entry)) entry.forEach(visit);
    else if (entry && typeof entry === 'object') Object.values(entry).forEach(visit);
  }
  visit(value);
  return [...found.values()];
}
export function adaptImportedMedia(value: unknown, projectUrl: string | undefined): unknown {
  if (typeof value === 'string') return value.replace(/https?:\/\/[^\s<>"']+/g, source => {
    const media = legacyMedia(source, projectUrl);
    return media ? `/api/content/media?bucket=${media.bucket}&path=${encodeURIComponent(media.path)}` : source;
  });
  if (Array.isArray(value)) return value.map(entry => adaptImportedMedia(entry, projectUrl));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .map(([key, entry]) => [key, adaptImportedMedia(entry, projectUrl)]));
  return value;
}
