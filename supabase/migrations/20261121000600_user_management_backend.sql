alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_role_active_idx
  on public.profiles (role, is_active);

create or replace function public.is_veticare_user_active()
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
      and profiles.is_active
  );
$$;

revoke all on function public.is_veticare_user_active() from public, anon;
grant execute on function public.is_veticare_user_active() to authenticated;

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
      and profiles.is_active
  );
$$;

do $$
declare
  table_name text;
begin
  for table_name in
    select schemaname || '.' || tablename
    from pg_tables
    where schemaname = 'public'
      and rowsecurity
  loop
    execute format('drop policy if exists %I on %s', 'Require active Veticare profile', table_name);
    execute format(
      'create policy %I on %s as restrictive for all to authenticated using ((select public.is_veticare_user_active())) with check ((select public.is_veticare_user_active()))',
      'Require active Veticare profile',
      table_name
    );
  end loop;
end;
$$;