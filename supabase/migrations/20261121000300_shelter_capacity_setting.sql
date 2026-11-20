create table if not exists public.shelter_settings (
  id boolean primary key default true check (id),
  kennel_capacity integer not null default 24 check (kennel_capacity > 0),
  updated_at timestamptz not null default now()
);

insert into public.shelter_settings (id, kennel_capacity)
values (true, 24)
on conflict (id) do nothing;

alter table public.shelter_settings enable row level security;
grant select on public.shelter_settings to authenticated;

drop policy if exists "Admins can read shelter settings" on public.shelter_settings;
create policy "Admins can read shelter settings"
  on public.shelter_settings
  for select
  to authenticated
  using (public.is_veticare_admin());