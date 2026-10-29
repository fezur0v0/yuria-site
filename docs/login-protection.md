# Login protection

Google and GitHub remain the only login buttons. Turnstile is optional until
the real Cloudflare widget is configured; there is no automatic test-key fallback.

## Activation

Create a Cloudflare Turnstile widget in **Managed** mode for `www.yuria.xin`
and `yuria.xin`. Pre-clearance is not needed. In Vercel production configure:

- `TURNSTILE_SITE_KEY`: the widget's public site key.
- `TURNSTILE_SECRET_KEY`: the secret key, as a sensitive server-only variable.
- `TURNSTILE_ENABLED=true`: enable only after both keys are present.

Redeploy after activation. Preview needs its own allowed hostname and configuration
if Turnstile should be enabled there. Do not enable it with production keys on an
unregistered preview hostname. Disabling the explicit feature flag restores the
previous OAuth flow without needing to change Google or GitHub credentials.

## Enforcement

The login page loads the public configuration from `/api/auth/start`, renders the
official Turnstile script, and initially shows only the verification step. The
Japanese composition and login buttons appear after a token is available; expiry
or verification failure returns to the gate. The widget stays mounted while its
step is hidden so expiry callbacks remain active. The site splash and floating
player are hidden on this login route. The
same-origin POST validates the token using Cloudflare Siteverify, checking success,
hostname, and the `login` action. Missing, expired, repeated, or failed tokens do
not start OAuth. Network failures fail closed. CSP permits only Cloudflare's
challenge origin for the required external script and iframe.

OAuth starts on the server so the PKCE verifier and a ten-minute, HttpOnly,
SameSite=Lax signed verification receipt are set together. The callback checks
that receipt against the exact verifier cookies before exchanging the OAuth code;
changing the verifier, forging the receipt, or skipping the protected entry point
fails. The receipt is cleared on callback success or failure. Supabase's code
exchange also enforces single-use OAuth codes. Existing authenticated Google
account linking verifies the current user before starting and on callback, and
binds the receipt to that user, instead of treating it as a new anonymous login.

Other site login buttons route to the shared verification page when enabled.
Existing sessions remain usable; Turnstile is not repeated on every page visit.

This protects this site's OAuth entry and callback. It does not turn on a global
CAPTCHA for Supabase's publicly accessible OAuth service or its direct token API.
The app's existing verified-user and owner checks remain the authorization layer.
Do not describe this as eliminating all automated account creation or as a WAF.

## Verification

`node --experimental-strip-types --test tests/turnstile.test.mjs` tests server
verification failure handling and the signed receipt's binding and expiry.
Build the HTTP test app with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:58437
NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture-anon npx next build --webpack`, then run
`node --experimental-strip-types tests/turnstile-http-check.mjs`. This exercises
the built app against isolated Auth and Siteverify fixtures. No real OAuth account,
email, or production credential is used. Real-widget delivery and provider
round trips must be checked after activation with the owner's browser.
