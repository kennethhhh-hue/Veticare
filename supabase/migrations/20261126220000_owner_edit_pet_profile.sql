create or replace function public.update_owner_pet_profile(
  p_pet_id uuid,
  p_name text,
  p_species text,
  p_breed text,
  p_sex text,
  p_age text,
  p_weight text,
  p_color text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_user_id uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = owner_user_id and profile.role = 'owner' and profile.is_active
      and profile.approval_status = 'approved' and profile.account_deleted_at is null
  ) then
    raise insufficient_privilege using message = 'An active owner account is required.';
  end if;

  if nullif(btrim(p_name), '') is null or nullif(btrim(p_breed), '') is null
    or nullif(btrim(p_age), '') is null or char_length(btrim(p_name)) > 120
    or char_length(btrim(p_breed)) > 120 or char_length(btrim(p_age)) > 40
    or char_length(btrim(p_weight)) > 40 or char_length(btrim(p_color)) > 80
    or p_species is null or p_species not in ('Dog', 'Cat')
    or p_sex is null or p_sex not in ('Male', 'Female') then
    raise exception 'Check the pet profile fields and try again.';
  end if;

  update public.pets
  set name = btrim(p_name), species = p_species, breed = btrim(p_breed), sex = p_sex,
      age = btrim(p_age), weight = coalesce(btrim(p_weight), ''), color = coalesce(btrim(p_color), '')
  where id = p_pet_id and owner_id = owner_user_id;

  return found;
end;
$$;

revoke all on function public.update_owner_pet_profile(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_owner_pet_profile(uuid, text, text, text, text, text, text, text) to authenticated;
