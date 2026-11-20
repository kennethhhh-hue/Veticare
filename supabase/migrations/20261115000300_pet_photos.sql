alter table public.pets
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'veticare-pet-photos',
  'veticare-pet-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can upload their pet photos" on storage.objects;
create policy "Owners can upload their pet photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'veticare-pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners can remove their pet photos" on storage.objects;
create policy "Owners can remove their pet photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'veticare-pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );