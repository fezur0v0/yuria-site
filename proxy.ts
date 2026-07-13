import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const protectedPaths = ['/notes/library', '/notes/records']

  if (protectedPaths.some(p => pathname.startsWith(p))) {
    const auth = request.cookies.get('notes_auth')
    if (!auth || auth.value !== 'true') {
      return NextResponse.redirect(new URL('/notes', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/notes/library/:path*', '/notes/records/:path*'],
}
