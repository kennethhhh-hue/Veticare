create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text not null default '',
  address text not null default '',
  barangay text not null default '',
  role text not null default 'owner',
  approval_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text not null default '',
  add column if not exists address text not null default '',
  add column if not exists barangay text not null default '',
  add column if not exists role text not null default 'owner',
  add column if not exists approval_status text not null default 'approved',
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  alter column role set default 'owner',
  alter column approval_status set default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'personnel', 'owner'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_approval_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end;
$$;

update public.profiles
set role = case
      when lower(coalesce(email, '')) = 'kennethadoyo@gmail.com' then 'admin'
      when lower(coalesce(email, '')) = 'marjes@gmail.com' then 'personnel'
      else role
    end,
    approval_status = case
      when lower(coalesce(email, '')) in ('kennethadoyo@gmail.com', 'marjes@gmail.com') then 'approved'
      else approval_status
    end;

insert into public.profiles (id, email, full_name, role, approval_status)
select
  auth_users.id,
  auth_users.email,
  coalesce(auth_users.raw_user_meta_data ->> 'full_name', ''),
  case
    when lower(auth_users.email) = 'kennethadoyo@gmail.com' then 'admin'
    when lower(auth_users.email) = 'marjes@gmail.com' then 'personnel'
    else 'owner'
  end,
  case
    when lower(auth_users.email) in ('kennethadoyo@gmail.com', 'marjes@gmail.com') then 'approved'
    else 'pending'
  end
from auth.users as auth_users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant update (full_name, phone, address, barangay, approval_status) on public.profiles to authenticated;

create or replace function public.is_veticare_admin()
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
      and profiles.role = 'admin'
  );
$$;

revoke all on function public.is_veticare_admin() from public, anon;
grant execute on function public.is_veticare_admin() to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_veticare_admin());

drop policy if exists "Admins can update owner profiles" on public.profiles;
create policy "Admins can update owner profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_veticare_admin() and role = 'owner')
  with check (public.is_veticare_admin() and role = 'owner');

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
begin
  insert into public.profiles (
    id, email, full_name, phone, address, barangay, role, approval_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'address', ''),
    coalesce(new.raw_user_meta_data ->> 'barangay', ''),
    'owner',
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();
