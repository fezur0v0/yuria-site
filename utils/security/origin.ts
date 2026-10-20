export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  if (origin !== expectedOrigin) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  return !fetchSite || fetchSite === 'same-origin';
}
