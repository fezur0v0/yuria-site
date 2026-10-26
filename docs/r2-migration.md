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
from guest views. The versioned-store writer contract is preparation only: the
concrete live R2 writer and the existing editor integration are still pending.

Tests: `node --experimental-strip-types --test tests/r2-content.test.mjs`.

## Subsequent phases (not yet implemented)

1. Reconcile object counts and references against the verified backup, repository
   assets, existing R2 files and external links. Classify by actual publication
   and use, never by the old `theater-images` bucket name.
2. Build R2 content readers/writers, search indexes, relations, publishing and
   conditional writes; keep draft and private indexes inside the private bucket.
3. Verify guest, ordinary user and owner access, editing, search, ordering, media,
   draft visibility and sitemap behavior in a preview.
4. Run a final export during a write pause, reconcile any intervening edits,
   then switch reads and writes together. Retain the original Supabase content.
5. Monitor and reconcile before discussing source cleanup separately. Supabase
   Auth remains enabled; do not delete its database or auth schema.

Tests: `node --experimental-strip-types --test tests/storage-backup.test.mjs`.
