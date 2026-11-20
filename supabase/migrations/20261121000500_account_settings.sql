create or replace function public.prevent_self_role_or_approval_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) = old.id
    and not public.is_veticare_admin()
    and (new.role is distinct from old.role or new.approval_status is distinct from old.approval_status) then
    raise exception 'You cannot change your own role or approval status.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_self_role_or_approval_change() from public, anon, authenticated;

drop trigger if exists prevent_self_role_or_approval_change on public.profiles;
create trigger prevent_self_role_or_approval_change
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_or_approval_change();

drop policy if exists "Users can update their own profile details" on public.profiles;
create policy "Users can update their own profile details"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);