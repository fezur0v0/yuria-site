-- Run after the six public/images/legacy-media assets are deployed.
-- Only media already embedded in visible public pages is copied.
-- Keep theater-images private and retain its original objects.
begin;
do $$
declare
  object_path text;
  old_url text;
  new_url text;
begin
  foreach object_path in array array[
    'cover-1785504732354.jpg',
    'cover-1784713796015.jpg',
    '1785071741596-l4f7ygrt8jo.png',
    'gallery/e976b221-895f-466e-8525-6ba63b0aaa13/1785858144875-____.jpg',
    'gallery/e976b221-895f-466e-8525-6ba63b0aaa13/1785858168601-___.jpg',
    'gallery/e976b221-895f-466e-8525-6ba63b0aaa13/1785858197285-xue.jpg'
  ] loop
    old_url := 'https://xgvvmxzpwnktdcmkejzh.supabase.co/storage/v1/object/public/theater-images/' || object_path;
    new_url := 'https://www.yuria.xin/images/legacy-media/' || object_path;

    update public.portfolio_items
    set cover_url = replace(cover_url, old_url, new_url),
        content = replace(content, old_url, new_url),
        images = replace(images::text, old_url, new_url)::jsonb
    where is_visible = true
      and (position(old_url in cover_url) > 0
        or position(old_url in content) > 0
        or position(old_url in images::text) > 0);

    update public.gallery_images g
    set image_url = new_url
    where image_url = old_url
      and exists (select 1 from public.gallery_albums a where a.id = g.album_id and a.is_visible = true);
  end loop;
end $$;
commit;
