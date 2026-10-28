// Loaded only by the isolated HTTP check's child process, never by the app.
const originalFetch = globalThis.fetch
if (!process.env.YURIA_AUTH_FIXTURE_ORIGIN?.startsWith('http://127.0.0.1:')) throw new Error('Local fixture origin required')
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
    return originalFetch(`${process.env.YURIA_AUTH_FIXTURE_ORIGIN}/siteverify`, init)
  }
  return originalFetch(input, init)
}
