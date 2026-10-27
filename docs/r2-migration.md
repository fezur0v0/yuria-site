# R2 content migration

## Current phase: owner-tested preview; final cutover available

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

`/admin/storage` now offers an owner-only final cutover using the latest original
Supabase content. The owner has explicitly chosen not to merge preview edits.
The single operation pauses site API saves with a conditional R2 marker, creates
a new verified database/media backup, re-reads source tables, file lists and
file bytes to detect drift, verifies the unique live document, then atomically
publishes its pointer in private `content/cutover.json`. No environment change
or second deployment is needed at activation. The preview document is untouched.

The marker selects `content/live/runs/<run>/current.json` and the matching fresh
media backup prefix for all live readers, writers and the dynamic anonymous
sitemap. A missing live document fails instead of falling back to stale backup
data. Errors before activation restore the original backend when the marker can
be read; unknown status remains paused until verified. An interrupted function
can be unlocked by the owner after six minutes, beyond the 300-second execution
budget. Recovery never rolls back an active R2 store, including an uncertain
activation response that may already have committed.

The API rejects old page write epochs after activation; reload open editors.
R2 preview cookies are ignored once live cutover is active. Private uploads
always pass through the owner-verified site API so migration pauses apply.
Keep all other editors, direct Supabase clients and uploads idle during the
operation. Source re-reads detect changes; the export is not a database-wide
transaction and cannot lock arbitrary external Supabase clients.

Original Supabase media URLs are adapted to `/api/content/media` in live reads.
Guest media access is checked against currently published content before reading
private R2 objects; owner access uses the verified session. Edited documents may
retain these adapted URLs, which remain valid reference sources. Theater images
also read new private live uploads before the matching fresh backup. Public R2
assets, repository image copies and external links remain in their current
locations; the Supabase originals are retained. This cutover does not claim that
repository assets or external image hosts have all been consolidated into R2.

`CONTENT_BACKEND=r2` remains a legacy override; do not set it before a validated
live store exists. The owner cutover marker is the supported activation path.

Tests: `npm run test:content` and `npm run test:auth`.

## Remaining phases

1. Reconcile object counts and references against the verified backup, repository
   assets, existing R2 files and external links. Classify by actual publication
   and use, never by the old `theater-images` bucket name.
2. Validate the content API and editing behavior against the real private R2
   preview, including conflict handling, search and media references.
3. Verify guest, ordinary user and owner access, editing, search, ordering, media,
   draft visibility and sitemap behavior in a preview.
4. Use the final cutover operation while signed in as owner and confirm the
   returned active state. This authenticated operation has not been run by the
   coding agent. Recheck live pages, private access and owner saves afterward.
5. Monitor and reconcile before discussing source cleanup separately. Supabase
   Auth remains enabled; do not delete its database or auth schema.

Tests: `node --experimental-strip-types --test tests/storage-backup.test.mjs`.

Cutover verification: `npm run test:content`, `npm run test:auth`, TypeScript and
the production build. `node tests/cutover-http-check.mjs` exercises the built app
against local Supabase/S3 HTTP fixtures with disposable credentials; it requires
permitted loopback access and does not contact production services.
