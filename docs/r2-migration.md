# R2 content migration

## Current phase: completed; temporary migration tools retired

On 2026-10-27 the owner completed source cleanup. A read-only database check
confirmed zero business rows, zero old password configurations and zero Storage
objects, with all four Auth users retained. The temporary storage page now
redirects to `/admin`. Backup, validation, cutover, image-consolidation and source
cleanup HTTP endpoints and UI components have been removed, as has the database
cleanup RPC. The read-only `/api/admin/content-preview` GET remains the browser
content client's backend/epoch handshake; its preview mutation endpoint is gone.
R2 live content, original migration backups, private media routes, editing,
version checks and Supabase Auth are retained.

The sections below describe the completed migration for historical reference.

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
4. The owner executed final cutover on 2026-10-27. The public live-mode endpoint
   reports R2 active; public essays, gallery and private access checks pass.
5. Monitor and reconcile before discussing source cleanup separately. Supabase
   Auth remains enabled; do not delete its database or auth schema.

Tests: `node --experimental-strip-types --test tests/storage-backup.test.mjs`.

Cutover verification: `npm run test:content`, `npm run test:auth`, TypeScript and
the production build. `node tests/cutover-http-check.mjs` exercises the built app
against local Supabase/S3 HTTP fixtures with disposable credentials; it requires
permitted loopback access and does not contact production services.

## Website images and external image consolidation

Deploy builds run `scripts/site-assets.mjs` before Next.js. The script copies all
public image files and the app icon/favicon into immutable content-hashed keys
in the public R2 bucket, reads back and checksum-verifies every object, then
generates the public URL manifest. A failed copy prevents publication. Local
builds without R2 credentials index the same manifest without uploading. The
five sidebar social icons now use the installed icon set, copied alongside
website media, instead of requesting another image CDN. The source files remain
as deployment/rollback copies. Known original paths permanently redirect to R2,
so old article URLs continue working. The apple touch icon uses the actual app
icon instead of a missing file.

The owner-only image consolidation panel reads the current live R2 document,
identifies image fields plus HTML/Markdown/CSS image references, and copies
external originals to public or private R2 according to publication status.
Music playback and ordinary social links are excluded. Already imported
Supabase references and repository image references are rewritten to their R2
locations without downloading the original hosts again. External downloads use
HTTPS, checked and pinned public DNS addresses, bounded redirects/bytes/time,
and image signature checks; no credentials or cookies are sent. Each upload is
checksum-verified before the document is saved with its original ETag. Failed
downloads keep their existing URL, remain in the pending count and appear in
the owner report. Work is automatically batched. Pause editing during this run.
Private imported images require owner authorization, or a current published
reference, before the server serves bytes from the private bucket.

## Retained Supabase inventory (read-only check, 2026-10-27)

Auth retains 4 users, with 3 GitHub identities and 2 Google identities. Original
business tables retain: site_config 2, site_settings 1, hero_lines 2, intro_lines
4, music_tracks 4, portfolio_items 3, gallery_albums 4, gallery_images 5,
theater_cards 54, theater_records 3 and characters 6. The unused access_config
table retains 2 old password configurations; its values were not exported.
All twelve public tables still have RLS enabled. Storage retains gallery: 1
file / 162,778 bytes (public), portfolio: empty (public), theater-images: 20
files / 9,914,871 bytes (private). No Supabase data, auth records, policies or
objects were deleted or changed during this inspection.

## Owner cleanup of retained Supabase copies

The owner-only `/admin/storage` cleanup panel checks the active cutover's full
database and file manifest, reads and verifies every R2 backup object, and
compares every remaining Supabase row and original image to the backup. New or
changed source content stops cleanup. Missing source rows/files are allowed for
retries. The exact remaining business snapshot is copied and read back in the
private R2 bucket before any source deletion. Auth records and password values
are never exported by this tool.

Only the approved scope (at most 88 business rows, 21 media files and 2 obsolete
password configurations) is eligible. Files are removed through the Supabase
Storage API, retaining buckets and all R2 copies. A `cleanup_legacy_content`
RPC then locks and compares all source tables and removes rows in one invoker
transaction, with children before parents. This RPC additionally checks the
same owner Auth UUID already used by the existing RLS policies; anonymous and
other authenticated callers cannot execute cleanup. If the owner account is
migrated to a new Auth UUID, update the existing RLS policies and RPC together.
It preserves table definitions, policies, Auth and provider bindings. Concurrent
cleanup requests use a conditional R2 lease; interrupted requests can be retried
after six minutes. Completion requires all three source counts to reach zero.
