import { createClient } from '@/utils/supabase/client'
import { safeAuthDestination } from '@/utils/auth/destination'

export { safeAuthDestination } from '@/utils/auth/destination'

const FLOW_KEY = 'yuria:auth-flow'

type AuthFlow = { kind: 'login' | 'link'; next: string; userId?: string }

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

export async function startAuth(provider: 'github' | 'google', next: string, linkUserId?: string) {
  const supabase = createClient()
  const flow: AuthFlow = {
    kind: linkUserId ? 'link' : 'login',
    next: safeAuthDestination(next),
    ...(linkUserId ? { userId: linkUserId } : {}),
  }
  sessionStorage.setItem(FLOW_KEY, JSON.stringify(flow))
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
