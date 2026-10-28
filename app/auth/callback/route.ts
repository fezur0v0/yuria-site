import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { safeAuthDestination } from '@/utils/auth/destination'
import { cookies } from 'next/headers'
import { loginProtection, OAUTH_CHECK_COOKIE, pkceBinding, readOAuthCheck } from '@/utils/auth/turnstile'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const siteOrigin = process.env.NODE_ENV === 'production' ? 'https://www.yuria.xin' : url.origin
  const code = url.searchParams.get('code')
  const cookieStore = await cookies()
  function redirect(target: string) {
    const response = NextResponse.redirect(target)
    response.cookies.set(OAUTH_CHECK_COOKIE, '', { path: '/', maxAge: 0, expires: new Date(0), httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:' })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  if (code) {
    const supabase = await createClient()
    try {
      const protection = loginProtection()
      if (protection.enabled) {
        const check = readOAuthCheck(cookieStore.get(OAUTH_CHECK_COOKIE)?.value,
          pkceBinding(cookieStore.getAll(), process.env.NEXT_PUBLIC_SUPABASE_URL!), protection.secret)
        if (!check) return redirect(`${siteOrigin}/admin/login?error=verification`)
        if (check.kind === 'link') {
          const { data: { user }, error } = await supabase.auth.getUser()
          if (error || user?.id !== check.userId) return redirect(`${siteOrigin}/admin/login?error=verification`)
        }
      }
    } catch {
      return redirect(`${siteOrigin}/admin/login?error=verification`)
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Older sign-in links may still include a return path.
      const next = safeAuthDestination(url.searchParams.get('next'), '/auth/complete')
      const target = new URL(next, siteOrigin)
      if (target.origin === siteOrigin) {
        return redirect(target.toString())
      }
    }
  }

  return redirect(`${siteOrigin}/auth/complete?error=oauth`)
}

export const dynamic = 'force-dynamic'
