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

drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_veticare_admin());

drop policy if exists "Admins can view all pets" on public.pets;
create policy "Admins can view all pets"
  on public.pets
  for select
  to authenticated
  using (public.is_veticare_admin());

drop policy if exists "Admins can register pets for owners" on public.pets;
create policy "Admins can register pets for owners"
  on public.pets
  for insert
  to authenticated
  with check (public.is_veticare_admin());

drop policy if exists "Admins can review pet registrations" on public.pets;
create policy "Admins can review pet registrations"
  on public.pets
  for update
  to authenticated
  using (public.is_veticare_admin())
  with check (public.is_veticare_admin());

grant update on public.pets to authenticated;
