import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const OAUTH_CHECK_COOKIE = 'yuria-oauth-check'
export const OAUTH_CHECK_SECONDS = 600
export const TURNSTILE_ACTION = 'login'

export function loginProtection(env: NodeJS.ProcessEnv = process.env) {
  if (env.TURNSTILE_ENABLED !== 'true') return { enabled: false as const }
  const siteKey = env.TURNSTILE_SITE_KEY?.trim()
  const secret = env.TURNSTILE_SECRET_KEY?.trim()
  if (!siteKey || !secret || siteKey.startsWith('1x000000') || secret.startsWith('1x000000')) {
    throw new Error('Login protection is not configured')
  }
  return { enabled: true as const, siteKey, secret }
}

export async function verifyTurnstile(token: unknown, secret: string, hostname: string, fetcher = fetch) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return false
    const result = await response.json()
    return result.success === true && result.hostname === hostname && result.action === TURNSTILE_ACTION
  } catch { return false }
}

type Cookie = { name: string; value: string }
export function pkceBinding(cookies: Cookie[], supabaseUrl: string) {
  const name = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token-code-verifier`
  const parts = cookies.filter(cookie => cookie.name === name ||
    (cookie.name.startsWith(`${name}.`) && /^\d+$/.test(cookie.name.slice(name.length + 1))))
    .filter(cookie => cookie.value).map(({ name, value }) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return parts.length ? createHash('sha256').update(JSON.stringify(parts)).digest('base64url') : null
}

export type OAuthCheck = { binding: string; kind: 'login' | 'link'; userId?: string }
function signature(payload: string, secret: string) {
  return createHmac('sha256', secret).update(`yuria-oauth-check-v1:${payload}`).digest('base64url')
}
export function createOAuthCheck(check: OAuthCheck, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ ...check, issuedAt: now })).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}
export function readOAuthCheck(value: string | undefined, binding: string | null, secret: string, now = Date.now()): OAuthCheck | null {
  if (!value || !binding || value.length > 2048) return null
  const [payload, mac, extra] = value.split('.')
  if (!payload || !mac || extra) return null
  const expected = Buffer.from(signature(payload, secret))
  const actual = Buffer.from(mac)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const check = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (check.binding !== binding || !Number.isSafeInteger(check.issuedAt) || check.issuedAt > now ||
      now - check.issuedAt >= OAUTH_CHECK_SECONDS * 1000 || !['login', 'link'].includes(check.kind) ||
      (check.kind === 'link' && typeof check.userId !== 'string')) return null
    return { binding, kind: check.kind, ...(check.kind === 'link' ? { userId: check.userId } : {}) }
  } catch { return null }
}
