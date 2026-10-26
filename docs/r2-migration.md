# R2 content migration

## Current phase: verified private backup

The owner-only `/admin/storage` page checks the configured private R2 bucket and
copies the eleven business content tables plus all objects in the three legacy
Supabase Storage buckets. It uses the current owner's verified Supabase session;
it does not need a service-role key. Authentication records and obsolete
`access_config` password hashes are excluded.

Set server-only `R2_PRIVATE_BUCKET_NAME=yuria-private` in the deployment. Existing
R2 credentials must allow listing, reading and writing this bucket. The bucket
must remain private (no r2.dev public access or public custom domain). The app
rejects configuring the public media bucket as the private backup destination;
it cannot independently inspect Cloudflare's public-access configuration using
object-only S3 credentials, so verify that setting in the dashboard.

The copy tool creates a unique `migration-backups/<run>/` prefix. `database.json`
retains the original values, IDs and media URLs. Objects retain their source
bucket and path below `storage/`. Every written object is read back and checked
with SHA-256 and byte length. A verified `manifest.json` marks completion. The
tool never deletes sources, changes visibility, rewrites URLs or changes website
readers. An interrupted run may leave a partial directory; it is not a usable
backup until its manifest has been verified. A new run uses a different prefix.

Pause content editing and uploads while copying. The export is paginated and
cross-table reads are not a transactional database snapshot. The web tool caps
individual images at 64 MiB and has a 300-second execution budget; larger or slow
exports need a resumable streaming job. External image/music links, files in the
website repository and existing R2 objects are not fetched by this Supabase copy.

## Verified content reader and authorization preparation

Set `R2_CONTENT_BACKUP_PREFIX` to a completed private backup. The owner-only
`/api/admin/storage-content-check` endpoint reads its completion manifest,
verifies the database byte length, SHA-256 and per-table record counts, and
returns only owner/guest counts. `/admin/storage` exposes this read-only check.
It does not initialize a live content store or change application readers.

`utils/migration/content.ts` defines and tests document validation, guest
filtering before search/counting, owner isolation and optimistic version checks.
Hidden or locked album images, draft essays and theater content are excluded
from guest views. The R2 store and editor integration are now available through
an owner browser preview; production cutover is not enabled.

Tests: `node --experimental-strip-types --test tests/r2-content.test.mjs`.

## Owner browser preview

Client content queries use `/api/content/[table]`. Default mode forwards them to
the existing Supabase REST API and retains database RLS. Every mutation also
requires same origin and server `getUser()` owner verification. Browser
`getSession()` only transports the bearer token; server authorization never
trusts that session payload. Auth-only clients remain unchanged.

The owner enters preview from `/admin/storage`. An HttpOnly same-site cookie
selects R2 for that owner browser for one hour. Request mode markers block stale
tabs when the preview expires or another tab changes mode, so test writes cannot
silently fall back to production. A persistent banner offers exit and reload.

Preview starts from the verified backup and writes to private
`content/preview/current.json`. Saves use table revisions and atomic S3
`If-Match`/`If-None-Match`; previous documents are archived under
`content/preview/history/`. Read revisions remain pinned until a successful
local write or full reload; the server-rendered essay editor receives its
initial revision. Sort patches are serialized per collection. Preview edits are
test data and are not automatically merged into production.

Queries cover current projection, character/card joins, exact counts,
pagination, sorting, category filters, tag containment/exclusion and text
matching. Mutations preserve existing database FK actions: album/image cascade,
card/record set-null and character reference restrictions. This is a bounded
content API, not a general SQL engine. Content documents are capped at 32 MiB.

Private images are served through authenticated routes from preview uploads or
the verified backup. New private R2 uploads use the same-origin server route,
limited to 4 MiB; default Supabase direct uploads retain existing behavior.
Larger private uploads need scoped presigned uploads plus bucket CORS if needed.
Public test uploads use the public bucket's `migration-preview/` prefix. Preview
deletion never deletes original R2 objects. Legacy private Supabase URLs are
adapted for display; public repository copies and external links are preserved.

`CONTENT_BACKEND=r2` is reserved for final cutover and is not enabled. Production
will use `content/live/current.json`; prepare a fresh verified export and pause
legacy writers before switching. Sitemap reads stay anonymous and published-only.

Tests: `npm run test:content` and `npm run test:auth`.

## Remaining phases

1. Reconcile object counts and references against the verified backup, repository
   assets, existing R2 files and external links. Classify by actual publication
   and use, never by the old `theater-images` bucket name.
2. Validate the content API and editing behavior against the real private R2
   preview, including conflict handling, search and media references.
3. Verify guest, ordinary user and owner access, editing, search, ordering, media,
   draft visibility and sitemap behavior in a preview.
4. Run a final export during a write pause, reconcile any intervening edits,
   then switch reads and writes together. Retain the original Supabase content.
5. Monitor and reconcile before discussing source cleanup separately. Supabase
   Auth remains enabled; do not delete its database or auth schema.

Tests: `node --experimental-strip-types --test tests/storage-backup.test.mjs`.
