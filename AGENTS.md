# AGENTS.md

Personal archive site (yuria.xin): images, words, music. Next.js 16 App Router, React 19,
TypeScript, Tailwind v4, Supabase Auth, Cloudflare R2, deployed on Vercel.

Parts of this repo predate your training data (Next 16 `params`/`proxy.ts`, Tailwind v4, content
stored outside Supabase). The rules below are the ones that actually bite.

## Commands

| command | notes |
| --- | --- |
| `npm run dev` | local development |
| `npm run build` | `node scripts/site-assets.mjs && next build` |
| `npm run lint` | currently fails on main with 26 pre-existing errors — not your regression |
| `npx tsc --noEmit` | fast type check |
| `npm run test:auth` / `test:music` / `test:content` | `node:test` suites |

Local builds need `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
(placeholders are enough to compile; real values only matter for auth). Six suites are not wired
into `package.json` — `tests/{me-content,me-crop,record-profile,sheet-gesture,echo-html,echo-tags}.test.mjs`:
`node --experimental-strip-types --test tests/<name>.test.mjs`.

## Architecture rules

### 1. Content is a single JSON document in R2, not Supabase

Supabase holds Auth only (legacy content pass-through still exists in the API but is inactive
since the 2026-10-27 cutover). Do not reintroduce Supabase REST/RPC for data.

- `utils/content/client.ts` fakes a supabase-js client, rewriting `.from()` calls to
  `/api/content/[table]`; `utils/content/server.ts` is its server-side mirror.
- `utils/migration/query.ts` implements a bounded PostgREST subset (select/filter/order/range/
  embed + writes). Only that subset exists — no SQL, no RPC, no new query operators.
- `utils/content/store.ts` owns reads/writes: `readContent()` and `saveContent()` (archive the old
  doc under `history/`, then atomic `If-Match` replace). Never write content keys directly.
- Optimistic locking is per table via `X-Yuria-Table-Version`. A 409 means re-read and retry;
  the client already surfaces the Chinese error copy for it.
- Live doc: `content/live/runs/<run>/current.json`; preview doc: `content/preview/current.json`
  (owner-only cookie `yuria-r2-preview=1`); publish pointer: `content/cutover.json`.
- Tables: `site_config`, `site_settings`, `hero_lines`, `intro_lines`, `music_tracks`,
  `portfolio_items`, `gallery_albums`, `gallery_images`, `theater_cards`, `theater_records`,
  `characters`.

### 2. Auth

- Supabase Auth (GitHub OAuth) only. No service-role key anywhere.
- Owner = GitHub identity `provider_id`/`sub`/`id` matching `OWNER_GITHUB_ID`
  (`utils/auth/owner.ts`). Everyone else is a normal user.
- `proxy.ts` is Next 16's middleware replacement (exported as `proxy`). Never create
  `middleware.ts`; it will not run and the auth guard disappears.
- Optional Turnstile gate for login: `TURNSTILE_ENABLED` + `TURNSTILE_SITE_KEY` +
  `TURNSTILE_SECRET_KEY`; verification happens server-side in `utils/auth/turnstile.ts`.
- `/admin/**` and `/notes/**` are owner-only; see `docs/login-protection.md`.

### 3. Next 16 specifics

- `params` and `searchParams` are Promises — await them.
- `next/image` only allows hosts/paths in `images.remotePatterns` (site-asset host,
  `/site-assets/**`). Other imagery uses raw `<img>` on purpose.
- CSP forbids `unsafe-eval`; `challenges.cloudflare.com` is the only third-party script origin.

### 4. Styling — three systems, match the page

- Tailwind v4 utilities: `/portfolio` list + detail, `/account`.
- CSS Modules (camelCase classes): gallery, me, links, notes.
- Global BEM classes: `app/home.css`, `app/account/account.css`.

Tailwind v4 has no config file and no animation plugin; `animate-in`-style classes are no-ops.
Motion respects `prefers-reduced-motion` via `components/gallery/useReducedMotion.ts`; there is no
animation library — do not add one.

### 5. Private workspaces: Verse and Echo

Both under `/notes`, owner-only: `verse` = `theater_cards` (cards, 3-state tag filter, CSS-columns
grid), `echo` = `theater_records` feed + `characters` management + per-record "Echo HTML" pages.
Code still names them `LibraryPage`/`RecordsPage`; `/notes/library` and `/notes/records*`
308-redirect to the canonical names in `next.config.ts`.

Echo HTML must keep rendering only inside the sandboxed iframe with the injected CSP
(`utils/notes/echo-html.ts`) — never via `dangerouslySetInnerHTML`.

### 6. Build assets

`scripts/site-assets.mjs` hashes files under `public/**` into `generated/site-assets.json`; on
Vercel (all 5 `R2_*` vars present) it also uploads them under immutable keys. On Windows with
`core.autocrlf=true` a local build rewrites that JSON with CRLF-derived hashes — never commit it.
`.gitattributes` is absent; don't add line-ending conversion to generated files.

## Conventions

- Chinese user-facing copy, English identifiers/comments.
- `utils/**` must stay runnable under `node --experimental-strip-types` (used by tests): no
  React/Next imports there. Explicit `.ts` import extensions are allowed.
- Tests are `node:test` `.mjs` files, no framework.
- `.env.example` lists the required env; the Turnstile vars are optional and not listed there yet.
- If you change an architectural rule above, update this file.

## Known issues (2026-11)

- `/guestbook` is linked from `components/PortfolioNav.tsx` but has no route (404).
- `npm run lint` fails with 26 errors (mainly `no-explicit-any`, `no-unused-vars`, react-hooks).
- Content is sparse test data (3 portfolio items, 1 test record, empty albums) — not a bug.
- Content API queries are capped at 8 KiB, each `or` at 32 terms, and each `ilike` pattern at
  256 Unicode code points. The 8M `ilike` work budget sums text length in UTF-16 code units
  times pattern length in code points across matches. It estimates matching work, rather than
  elapsed time or total request cost. Filtering happens before pagination, so even a short
  pattern or small result limit can return HTTP 400 when scanning enough text.
