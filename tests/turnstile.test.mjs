import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOAuthCheck, loginProtection, OAUTH_CHECK_SECONDS, pkceBinding, readOAuthCheck, verifyTurnstile } from '../utils/auth/turnstile.ts'

const secret = 'isolated-test-secret-not-a-real-credential'
test('activation is explicit and incomplete or Cloudflare dummy configuration cannot enable protection', () => {
  assert.deepEqual(loginProtection({}), { enabled: false })
  assert.throws(() => loginProtection({ TURNSTILE_ENABLED: 'true' }))
  assert.throws(() => loginProtection({ TURNSTILE_ENABLED: 'true', TURNSTILE_SITE_KEY: '1x00000000000000000000AA', TURNSTILE_SECRET_KEY: secret }))
  assert.equal(loginProtection({ TURNSTILE_ENABLED: 'true', TURNSTILE_SITE_KEY: 'fixture-site', TURNSTILE_SECRET_KEY: secret }).enabled, true)
})
test('verification requires Cloudflare success, matching hostname and action', async () => {
  let calls = 0
  const mock = result => async (url, init) => {
    calls++
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
    assert.deepEqual(JSON.parse(init.body), { secret, response: 'fixture-response' })
    assert.equal(init.cache, 'no-store')
    return Response.json(result)
  }
  const passed = { success: true, hostname: 'www.yuria.xin', action: 'login' }
  assert.equal(await verifyTurnstile('', secret, 'www.yuria.xin', mock(passed)), false)
  assert.equal(await verifyTurnstile('x'.repeat(2049), secret, 'www.yuria.xin', mock(passed)), false)
  assert.equal(calls, 0)
  assert.equal(await verifyTurnstile('fixture-response', secret, 'www.yuria.xin', mock(passed)), true)
  for (const result of [{ ...passed, success: false }, { ...passed, hostname: 'other.example' }, { ...passed, action: 'contact' }, {}]) {
    assert.equal(await verifyTurnstile('fixture-response', secret, 'www.yuria.xin', mock(result)), false)
  }
  assert.equal(await verifyTurnstile('fixture-response', secret, 'www.yuria.xin', async () => { throw new Error('offline') }), false)
  assert.equal(await verifyTurnstile('fixture-response', secret, 'www.yuria.xin', async () => new Response('unavailable', { status: 503 })), false)
})
test('proof is tied to the exact PKCE cookies and cannot be moved to another login attempt', () => {
  const url = 'https://fixture.supabase.co'
  const cookies = [{ name: 'sb-fixture-auth-token-code-verifier', value: 'fixture-pkce' }]
  const binding = pkceBinding(cookies, url)
  assert.ok(binding)
  assert.equal(pkceBinding([...cookies, { name: 'unrelated', value: 'ignored' }], url), binding)
  assert.equal(pkceBinding([], url), null)
  const now = 1000000
  const proof = createOAuthCheck({ binding, kind: 'login' }, secret, now)
  assert.deepEqual(readOAuthCheck(proof, binding, secret, now + 1), { binding, kind: 'login' })
  for (const invalid of [undefined, '', `${proof}x`, `${proof}.extra`, `${proof.split('.')[0]}.forged`]) {
    assert.equal(readOAuthCheck(invalid, binding, secret, now), null)
  }
  assert.equal(readOAuthCheck(proof, binding, 'wrong-secret', now), null)
  assert.equal(readOAuthCheck(proof, pkceBinding([{ ...cookies[0], value: 'other-pkce' }], url), secret, now), null)
  assert.equal(readOAuthCheck(proof, null, secret, now), null)
  assert.equal(readOAuthCheck(proof, binding, secret, now - 1), null)
  assert.equal(readOAuthCheck(proof, binding, secret, now + OAUTH_CHECK_SECONDS * 1000), null)
  const linked = createOAuthCheck({ binding, kind: 'link', userId: 'fixture-user' }, secret, now)
  assert.equal(readOAuthCheck(linked, binding, secret, now).userId, 'fixture-user')
})
