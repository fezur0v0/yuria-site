import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const counts = { verified: 0, exchanged: 0, linked: 0 }
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'fixture@example.invalid', identities: [{ provider: 'github', identity_data: { provider_id: 'fixture-owner' } }] }
const exp = Math.floor(Date.now() / 1000) + 3600
const accessToken = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
  Buffer.from(JSON.stringify({ sub: user.id, exp, aud: 'authenticated', role: 'authenticated' })).toString('base64url'), 'fixture-signature'].join('.')
const session = { access_token: accessToken, refresh_token: 'fixture-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }
const sessionCookie = `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
const json = (response, value, status = 200) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)) }
const fixture = createServer(async (request, response) => {
  const chunks = []; for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString()
  const url = new URL(request.url, 'http://fixture.invalid')
  if (url.pathname === '/siteverify') {
    counts.verified++
    const token = JSON.parse(body).response
    return json(response, { success: token === 'fixture-pass' || token === 'wrong-host' || token === 'wrong-action',
      hostname: token === 'wrong-host' ? 'other.invalid' : 'localhost', action: token === 'wrong-action' ? 'contact' : 'login' })
  }
  if (url.pathname === '/auth/v1/user') return json(response, user)
  if (url.pathname === '/auth/v1/token') {
    assert.equal(url.searchParams.get('grant_type'), 'pkce')
    assert.ok(JSON.parse(body).code_verifier)
    counts.exchanged++
    return json(response, session)
  }
  if (url.pathname === '/auth/v1/user/identities/authorize') {
    counts.linked++
    return json(response, { url: `https://provider.invalid/link?${url.searchParams}` })
  }
  return json(response, { error: 'Unexpected isolated request', path: url.pathname }, 404)
})
// Match the disposable public URL injected when building this HTTP test app.
await new Promise(resolve => fixture.listen(58437, '127.0.0.1', resolve))
const fixtureOrigin = `http://127.0.0.1:${fixture.address().port}`
const reserve = createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve))
const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve))
const origin = `http://localhost:${port}`
const hook = fileURLToPath(new URL('./fixtures/turnstile-fetch.mjs', import.meta.url))
const child = spawn(process.execPath, ['--import', hook, 'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: fixtureOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon',
    OWNER_GITHUB_ID: 'fixture-owner', TURNSTILE_ENABLED: 'true', TURNSTILE_SITE_KEY: 'fixture-site',
    TURNSTILE_SECRET_KEY: 'isolated-test-secret-not-a-real-credential', YURIA_AUTH_FIXTURE_ORIGIN: fixtureOrigin },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''; child.stdout.on('data', value => { output += value }); child.stderr.on('data', value => { output += value })
const post = (body, headers = {}) => fetch(`${origin}/api/auth/start`, { method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), redirect: 'manual' })
const cookieHeader = response => response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${origin}/api/auth/start`, { signal: AbortSignal.timeout(500) })).ok) break } catch {}
    if (attempt === 59) throw new Error(`App did not start: ${output}`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  const config = await fetch(`${origin}/api/auth/start`)
  assert.deepEqual(await config.json(), { enabled: true, siteKey: 'fixture-site' })
  assert.match(config.headers.get('cache-control'), /no-store/)
  for (const token of [undefined, '', 'fixture-fail', 'wrong-host', 'wrong-action', 'x'.repeat(2049)]) {
    const denied = await post({ provider: 'github', captchaToken: token })
    assert.equal(denied.status, 403)
    assert.equal(denied.headers.getSetCookie().some(cookie => cookie.startsWith('yuria-oauth-check=')), false)
  }
  assert.equal((await post({ provider: 'other', captchaToken: 'fixture-pass' })).status, 400)
  assert.equal((await post({ provider: 'github', captchaToken: 'fixture-pass' }, { Origin: 'https://other.invalid' })).status, 403)
  assert.equal((await post({ provider: 'google', linkUserId: user.id })).status, 401)
  assert.equal((await post({ provider: 'google', linkUserId: 'wrong-user' }, { Cookie: sessionCookie })).status, 401)
  assert.equal(counts.exchanged, 0)
  for (const provider of ['github', 'google']) {
    const started = await post({ provider, captchaToken: 'fixture-pass' })
    assert.equal(started.status, 200, await started.clone().text())
    const url = new URL((await started.json()).url)
    assert.equal(url.searchParams.get('provider'), provider)
    assert.equal(url.searchParams.get('redirect_to'), `${origin}/auth/callback`)
    assert.ok(url.searchParams.get('code_challenge'))
    assert.equal(url.searchParams.get('code_challenge_method'), 's256')
    const cookies = cookieHeader(started)
    assert.match(cookies, /sb-127-auth-token-code-verifier=/)
    assert.match(cookies, /yuria-oauth-check=/)
    assert.match(started.headers.getSetCookie().find(cookie => cookie.startsWith('yuria-oauth-check=')), /HttpOnly/i)
    for (const cookie of ['', cookies.replace(/yuria-oauth-check=[^;]+/, 'yuria-oauth-check=forged'),
      cookies.replace(/sb-127-auth-token-code-verifier=[^;]+/, 'sb-127-auth-token-code-verifier=changed')]) {
      const denied = await fetch(`${origin}/auth/callback?code=fixture-code`, { headers: { Cookie: cookie }, redirect: 'manual' })
      assert.equal(denied.status, 307)
      assert.match(denied.headers.get('location'), /\/admin\/login\?error=verification$/)
    }
    const previous = counts.exchanged
    const accepted = await fetch(`${origin}/auth/callback?code=fixture-code`, { headers: { Cookie: cookies }, redirect: 'manual' })
    assert.equal(accepted.status, 307)
    assert.match(accepted.headers.get('location'), /\/auth\/complete$/)
    assert.equal(counts.exchanged, previous + 1)
    assert.ok(accepted.headers.getSetCookie().some(cookie => cookie.startsWith('yuria-oauth-check=;') && /(?:Max-Age=0|Expires=Thu, 01 Jan 1970)/i.test(cookie)),
      accepted.headers.getSetCookie().map(cookie => cookie.replace(/^[^;]+/, value => `${value.split('=')[0]}=<redacted>`)).join('\n'))
  }
  const linked = await post({ provider: 'google', linkUserId: user.id }, { Cookie: sessionCookie })
  assert.equal(linked.status, 200, await linked.clone().text())
  assert.equal(counts.linked, 1)
  const noSession = await fetch(`${origin}/auth/callback?code=fixture-code`, { headers: { Cookie: cookieHeader(linked) }, redirect: 'manual' })
  assert.match(noSession.headers.get('location'), /error=verification$/)
  const withSession = await fetch(`${origin}/auth/callback?code=fixture-code`, { headers: { Cookie: `${cookieHeader(linked)}; ${sessionCookie}` }, redirect: 'manual' })
  assert.match(withSession.headers.get('location'), /\/auth\/complete$/)
  const csp = config.headers.get('content-security-policy')
  assert.match(csp, /script-src[^;]*https:\/\/challenges.cloudflare.com/)
  assert.match(csp, /frame-src https:\/\/challenges.cloudflare.com/)
  console.log('Turnstile HTTP checks passed: rejected invalid/cross-origin requests, both OAuth providers, PKCE-bound callback, and verified account linking.')
} catch (error) {
  console.error('Isolated fixture counters:', counts)
  console.error(output)
  throw error
} finally {
  child.kill('SIGTERM')
  await new Promise(resolve => child.once('exit', resolve))
  await new Promise(resolve => fixture.close(resolve))
}
