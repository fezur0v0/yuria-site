export function safeAuthDestination(next: string | null | undefined, fallback = '/admin') {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback
  try {
    const decoded = decodeURIComponent(next)
    if (decoded.startsWith('//') || decoded.includes('\\')) return fallback
    const path = new URL(next, 'https://www.yuria.xin').pathname
    if (path === '/account' || path === '/admin' || path.startsWith('/admin/') ||
        path === '/notes' || path.startsWith('/notes/')) return next
  } catch { /* Invalid percent escapes are never navigated. */ }
  return fallback
}
