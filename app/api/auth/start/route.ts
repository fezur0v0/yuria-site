import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createOAuthCheck, loginProtection, OAUTH_CHECK_COOKIE, OAUTH_CHECK_SECONDS, pkceBinding, verifyTurnstile } from '@/utils/auth/turnstile'

const noStore = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  try {
    const config = loginProtection()
    return NextResponse.json(config.enabled ? { enabled: true, siteKey: config.siteKey } : { enabled: false }, { headers: noStore })
  } catch {
    return NextResponse.json({ error: '登录验证服务暂时不可用，请稍后重试。' }, { status: 503, headers: noStore })
  }
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  if (request.headers.get('origin') !== origin) {
    return NextResponse.json({ error: '请求来源无效，请刷新后重试。' }, { status: 403, headers: noStore })
  }
  try {
    const config = loginProtection()
    if (!config.enabled) return NextResponse.json({ error: '验证尚未启用。' }, { status: 409, headers: noStore })
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return NextResponse.json({ error: '请求格式无效。' }, { status: 400, headers: noStore })
    }
    const text = await request.text()
    if (text.length > 4096) return NextResponse.json({ error: '请求过长。' }, { status: 413, headers: noStore })
    let input
    try { input = JSON.parse(text) } catch { return NextResponse.json({ error: '请求格式无效。' }, { status: 400, headers: noStore }) }
    if (!input || !['github', 'google'].includes(input.provider)) {
      return NextResponse.json({ error: '请选择支持的登录方式。' }, { status: 400, headers: noStore })
    }
    const supabase = await createClient()
    const linking = typeof input.linkUserId === 'string'
    if (linking) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user || user.id !== input.linkUserId || input.provider !== 'google') {
        return NextResponse.json({ error: '登录状态已变化，请重新登录。' }, { status: 401, headers: noStore })
      }
    } else if (!await verifyTurnstile(input.captchaToken, config.secret, new URL(origin).hostname)) {
      return NextResponse.json({ error: '真人验证未通过或已过期，请重新验证。' }, { status: 403, headers: noStore })
    }
    const redirectTo = `${origin}/auth/callback`
    const options = { redirectTo, skipBrowserRedirect: true }
    const result = linking
      ? await supabase.auth.linkIdentity({ provider: 'google', options })
      : await supabase.auth.signInWithOAuth({ provider: input.provider, options })
    if (result.error || !result.data?.url) throw new Error('Could not start OAuth')
    const cookieStore = await cookies()
    const binding = pkceBinding(cookieStore.getAll(), process.env.NEXT_PUBLIC_SUPABASE_URL!)
    if (!binding) throw new Error('PKCE verifier missing')
    const response = NextResponse.json({ url: result.data.url }, { headers: noStore })
    response.cookies.set(OAUTH_CHECK_COOKIE, createOAuthCheck({ binding, kind: linking ? 'link' : 'login',
      ...(linking ? { userId: input.linkUserId } : {}) }, config.secret), {
      httpOnly: true, secure: new URL(origin).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: OAUTH_CHECK_SECONDS,
    })
    return response
  } catch {
    return NextResponse.json({ error: '暂时无法连接登录服务，请稍后再试。' }, { status: 503, headers: noStore })
  }
}

export const runtime = 'nodejs'
