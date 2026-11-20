alter table public.pets
  add column if not exists rfid_tag text,
  add column if not exists qr_code text;

create unique index if not exists pets_rfid_tag_unique
  on public.pets (rfid_tag)
  where rfid_tag is not null and rfid_tag <> '';

create unique index if not exists pets_qr_code_unique
  on public.pets (qr_code)
  where qr_code is not null and qr_code <> '';

create or replace function public.is_veticare_personnel()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'personnel'
  );
$$;

revoke all on function public.is_veticare_personnel() from public, anon;
grant execute on function public.is_veticare_personnel() to authenticated;

drop policy if exists "Personnel can look up approved pets" on public.pets;
create policy "Personnel can look up approved pets"
  on public.pets
  for select
  to authenticated
  using (
    public.is_veticare_personnel()
    and status = 'approved'
    and pet_id is not null
    and rfid_tag is not null
    and qr_code is not null
  );

drop policy if exists "Personnel can read approved owner profiles for lookup" on public.profiles;
create policy "Personnel can read approved owner profiles for lookup"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_veticare_personnel()
    and role = 'owner'
    and approval_status = 'approved'
  );
