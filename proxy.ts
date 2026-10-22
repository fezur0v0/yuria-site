import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOwnerUser } from '@/utils/auth/owner'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminAuthPage =
    pathname === '/admin/login' || pathname === '/admin/unauthorized'
  const isNotesContentRoute = pathname.startsWith('/notes/')
  const isProtectedRoute =
    (pathname.startsWith('/admin') && !isAdminAuthPage) ||
    isNotesContentRoute

  function redirectWithSession(url: URL) {
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL(isNotesContentRoute ? '/notes' : '/admin/login', request.url)
      loginUrl.searchParams.set(
        'next',
        `${pathname}${request.nextUrl.search}`
      )
      return redirectWithSession(loginUrl)
    }

    if (!isOwnerUser(user)) {
      return redirectWithSession(new URL('/admin/unauthorized', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/notes/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
