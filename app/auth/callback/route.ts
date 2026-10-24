import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { safeAuthDestination } from '@/utils/auth/destination'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const siteOrigin = process.env.NODE_ENV === 'production' ? 'https://www.yuria.xin' : url.origin
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Older sign-in links may still include a return path.
      const next = safeAuthDestination(url.searchParams.get('next'), '/auth/complete')
      const target = new URL(next, siteOrigin)
      if (target.origin === siteOrigin) {
        const response = NextResponse.redirect(target)
        response.headers.set('Cache-Control', 'private, no-store')
        return response
      }
    }
  }

  const response = NextResponse.redirect(`${siteOrigin}/auth/complete?error=oauth`)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const dynamic = 'force-dynamic'
