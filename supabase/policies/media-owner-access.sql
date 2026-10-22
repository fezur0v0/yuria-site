-- Applied remotely as restrict_legacy_media_buckets_to_owner.
-- Matches the existing owner-only policies on private content tables.
drop policy if exists "allow all" on storage.objects;
drop policy if exists "allow all gallery" on storage.objects;
drop policy if exists "allow all theater images" on storage.objects;
drop policy if exists "media_owner_access" on storage.objects;

create policy "media_owner_access" on storage.objects
for all to authenticated
using (
  bucket_id in ('portfolio', 'gallery', 'theater-images')
  and (select auth.uid()) = '497a90df-eacf-4edc-8891-8b69fa7d8421'::uuid
)
with check (
  bucket_id in ('portfolio', 'gallery', 'theater-images')
  and (select auth.uid()) = '497a90df-eacf-4edc-8891-8b69fa7d8421'::uuid
);

-- Apply only after the authenticated media route and legacy URL adapter are deployed.
update storage.buckets set public = false where id = 'theater-images';
