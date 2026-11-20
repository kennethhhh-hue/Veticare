create table if not exists public.impounds (
  id uuid primary key default gen_random_uuid(),
  impound_id text not null unique,
  pet_id text not null,
  animal_type text not null check (animal_type in ('Dog', 'Cat')),
  name text not null,
  breed text not null,
  sex text not null check (sex in ('Male', 'Female')),
  age text not null,
  color text not null,
  area text not null,
  kennel text not null default 'K-NEW',
  impounded_at date not null default current_date,
  impound_status text not null default 'impounded'
    check (impound_status in ('impounded', 'claimed', 'released')),
  adoption_status text not null default 'available'
    check (adoption_status in ('not_available', 'available', 'pending', 'adopted')),
  status text not null default 'kennel'
    check (status in ('kennel', 'foster', 'reserved')),
  vaccinated boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists impounds_status_created_at_idx
  on public.impounds (impound_status, created_at desc);

alter table public.impounds enable row level security;
grant select, insert, update on public.impounds to authenticated;

drop policy if exists "Admins can view impounds" on public.impounds;
create policy "Admins can view impounds"
  on public.impounds
  for select
  to authenticated
  using (public.is_veticare_admin());

drop policy if exists "Admins can create impounds" on public.impounds;
create policy "Admins can create impounds"
  on public.impounds
  for insert
  to authenticated
  with check (public.is_veticare_admin());

drop policy if exists "Admins can update impounds" on public.impounds;
create policy "Admins can update impounds"
  on public.impounds
  for update
  to authenticated
  using (public.is_veticare_admin())
  with check (public.is_veticare_admin());

create or replace function public.set_impound_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_impound_updated_at on public.impounds;
create trigger set_impound_updated_at
  before update on public.impounds
  for each row execute procedure public.set_impound_updated_at();