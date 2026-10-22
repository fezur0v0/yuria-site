const BUCKET = 'theater-images';
const MEDIA_ROUTE = '/api/notes/media';

export function isValidTheaterObjectPath(path: string) {
  return path.length > 0 && path.length <= 1024 &&
    !/[\\%\u0000-\u001f\u007f]/.test(path) &&
    path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export function theaterMediaUrl(path: string) {
  if (!isValidTheaterObjectPath(path)) throw new Error('Invalid theater image path');
  return `${MEDIA_ROUTE}?path=${encodeURIComponent(path)}`;
}

// Existing database URLs are converted only when displayed; no file moves are needed.
export function privateTheaterMediaUrl(source: string) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl || !source) return source;

  try {
    const url = new URL(source);
    if (url.origin !== new URL(projectUrl).origin) return source;

    for (const mode of ['public', 'sign', 'authenticated']) {
      const prefix = `/storage/v1/object/${mode}/${BUCKET}/`;
      if (url.pathname.startsWith(prefix)) {
        const path = decodeURIComponent(url.pathname.slice(prefix.length));
        return isValidTheaterObjectPath(path) ? theaterMediaUrl(path) : '';
      }
    }
  } catch {
    // Relative app URLs and external images remain usable.
  }
  return source;
}
