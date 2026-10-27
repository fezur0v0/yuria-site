import { createHash } from 'node:crypto';
import { visibleContent, type ContentDocument } from './content.ts';
import { legacyMedia } from './legacyMedia.ts';

type AssetMap = Record<string, string>;
export type ImageJob = { source: string; public: boolean; host: string; destination?: string };
const htmlImages = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
const markdownImages = /!\[[^\]]*\]\(([^\s)]+)(?:\s+["'][^"']*["'])?\)/g;
const cssImages = /url\(\s*["']?(https?:\/\/[^\s)'"<>]+)["']?\s*\)/g;

export function imageReferences(document: ContentDocument) {
  const urls = new Set<string>();
  function image(value: unknown) {
    if (typeof value === 'string' && value.trim() && !/^data:image\//i.test(value.trim())) urls.add(value.trim());
    else if (Array.isArray(value)) value.forEach(image);
    else if (value && typeof value === 'object') for (const [key, entry] of Object.entries(value)) {
      if (['url', 'src', 'image_url', 'path'].includes(key)) image(entry);
    }
  }
  function content(value: unknown) {
    if (typeof value !== 'string') return;
    for (const regex of [htmlImages, markdownImages, cssImages]) {
      for (const match of value.matchAll(regex)) image(match[1]);
    }
  }
  for (const row of document.tables.site_config) if (row.key === 'cover_url') image(row.value);
  for (const row of document.tables.site_settings) { image(row.avatar_url); image(row.hero_image_url); }
  for (const row of document.tables.music_tracks) image(row.cover_url);
  for (const row of document.tables.portfolio_items) { image(row.cover_url); image(row.images); content(row.content); }
  for (const row of document.tables.gallery_albums) image(row.cover_image_url);
  for (const row of document.tables.gallery_images) image(row.image_url);
  for (const row of document.tables.theater_records) { image(row.images); content(row.content); }
  for (const row of document.tables.theater_cards) content(row.content);
  for (const row of document.tables.characters) image(row.avatar);
  return [...urls];
}

export function planImages(document: ContentDocument, options: { siteOrigin: string; publicR2: string; projectUrl?: string; assets: AssetMap }): ImageJob[] {
  const publicRefs = new Set(imageReferences(visibleContent(document, false)));
  const r2 = new URL(options.publicR2);
  return imageReferences(document).flatMap(source => {
    let url: URL;
    try { url = new URL(source.replaceAll('&amp;', '&'), options.siteOrigin); }
    catch { return []; }
    if (url.origin === r2.origin && url.pathname.startsWith(r2.pathname.replace(/\/$/, '') + '/')) return [];
    const job = { source, public: publicRefs.has(source), host: url.hostname };
    if (url.origin === options.siteOrigin) {
      if (options.assets[url.pathname]) return [{ ...job, destination: options.assets[url.pathname] }];
      if (/^\/api\/(?:content\/(?:media|image)|notes\/media)$/.test(url.pathname)) return [];
      return [{ ...job, host: '本站未识别图片' }];
    }
    const imported = legacyMedia(source, options.projectUrl);
    if (imported) return [{ ...job, destination: `/api/content/media?bucket=${imported.bucket}&path=${encodeURIComponent(imported.path)}` }];
    return [job];
  });
}

export function rewriteImageUrls(document: ContentDocument, replacements: Map<string, string>): ContentDocument {
  const ordered = [...replacements].sort(([a], [b]) => b.length - a.length);
  function replace(value: unknown): unknown {
    if (typeof value === 'string') return ordered.reduce((text, [source, target]) => text.split(source).join(target), value);
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replace(entry)]));
    return value;
  }
  return replace(document) as ContentDocument;
}

export const imageDigest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function detectedImageType(bytes: Uint8Array) {
  const hex = Buffer.from(bytes.subarray(0, 16)).toString('hex');
  const ascii = Buffer.from(bytes.subarray(0, 16)).toString('ascii');
  if (hex.startsWith('ffd8ff')) return { type: 'image/jpeg', extension: 'jpg' };
  if (hex.startsWith('89504e470d0a1a0a')) return { type: 'image/png', extension: 'png' };
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return { type: 'image/gif', extension: 'gif' };
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return { type: 'image/webp', extension: 'webp' };
  if (ascii.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii.slice(8, 12))) return { type: 'image/avif', extension: 'avif' };
  if (hex.startsWith('424d')) return { type: 'image/bmp', extension: 'bmp' };
  throw new Error('下载结果不是可识别的图片，原地址已保留');
}
