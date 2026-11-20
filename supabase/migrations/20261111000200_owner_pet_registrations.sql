create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  species text not null check (species in ('Dog', 'Cat')),
  breed text not null,
  age text not null,
  sex text not null check (sex in ('Male', 'Female')),
  weight text not null default '',
  color text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  pet_id text unique,
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;
grant select, insert on public.pets to authenticated;

drop policy if exists "Owners can view their own pets" on public.pets;
create policy "Owners can view their own pets"
  on public.pets
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can submit their own pets" on public.pets;
create policy "Owners can submit their own pets"
  on public.pets
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'owner'
    )
  );
