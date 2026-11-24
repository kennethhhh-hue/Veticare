alter table public.profiles
  add column account_deleted_at timestamptz,
  add constraint profiles_deleted_account_is_inactive
    check (account_deleted_at is null or not is_active);

create function public.mark_profile_account_deleted()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set account_deleted_at = new.deleted_at,
      is_active = false
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.mark_profile_account_deleted() from public, anon, authenticated;

create trigger mark_profile_after_auth_soft_delete
  after update of deleted_at on auth.users
  for each row
  when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.mark_profile_account_deleted();

update public.profiles as profile
set account_deleted_at = auth_user.deleted_at,
    is_active = false
from auth.users as auth_user
where profile.id = auth_user.id and auth_user.deleted_at is not null;

create policy "Pet registrations require a current owner account"
  on public.pets as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.profiles
    where profiles.id = pets.owner_id and profiles.account_deleted_at is null
  ));

create policy "Adoption applications require a current owner account"
  on public.adoption_applications as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.profiles
    where profiles.id = adoption_applications.applicant_id and profiles.account_deleted_at is null
  ));
