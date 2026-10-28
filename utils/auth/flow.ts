import { createClient } from '@/utils/supabase/client'
import { safeAuthDestination } from '@/utils/auth/destination'

export { safeAuthDestination } from '@/utils/auth/destination'

const FLOW_KEY = 'yuria:auth-flow'

type AuthFlow = { kind: 'login' | 'link'; next: string; userId?: string }

export async function getLoginProtection() {
  const response = await fetch('/api/auth/start', { cache: 'no-store' })
  if (!response.ok) throw new Error('登录验证服务暂时不可用，请稍后重试。')
  return await response.json() as { enabled: boolean; siteKey?: string }
}

export function takeAuthFlow(): AuthFlow | null {
  const raw = sessionStorage.getItem(FLOW_KEY)
  sessionStorage.removeItem(FLOW_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed) || !('next' in parsed)) return null
    const flow = parsed as AuthFlow
    if (flow.kind !== 'login' && flow.kind !== 'link') return null
    return { kind: flow.kind, next: safeAuthDestination(flow.next), userId: flow.userId }
  } catch { return null }
}

export async function startAuth(provider: 'github' | 'google', next: string, linkUserId?: string, captchaToken?: string) {
  const protection = await getLoginProtection()
  if (protection.enabled && !linkUserId && !captchaToken) {
    // All existing entry points, including the notes intro, share the verification page.
    const query = new URLSearchParams({ next: safeAuthDestination(next), provider })
    window.location.assign(new URL(`/admin/login?${query}`, window.location.origin).href)
    return
  }
  const flow: AuthFlow = {
    kind: linkUserId ? 'link' : 'login',
    next: safeAuthDestination(next),
    ...(linkUserId ? { userId: linkUserId } : {}),
  }
  sessionStorage.setItem(FLOW_KEY, JSON.stringify(flow))
  if (protection.enabled) {
    try {
      const response = await fetch('/api/auth/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, captchaToken, linkUserId }),
      })
      const result = await response.json()
      if (!response.ok || typeof result.url !== 'string') throw new Error(result.error || '暂时无法连接登录服务。')
      window.location.assign(result.url)
      return
    } catch (error) {
      sessionStorage.removeItem(FLOW_KEY)
      throw error
    }
  }
  const supabase = createClient()
  // Match the single exact redirect URL configured in Supabase.
  const redirectTo = `${window.location.origin}/auth/callback`
  const result = linkUserId
    ? await supabase.auth.linkIdentity({ provider, options: { redirectTo, skipBrowserRedirect: true } })
    : await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } })

  if (result.error || !result.data?.url) {
    sessionStorage.removeItem(FLOW_KEY)
    throw result.error ?? new Error('OAuth URL missing')
  }
  window.location.assign(result.data.url)
}
