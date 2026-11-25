alter table public.impounds add column if not exists photo_url text;

create or replace view public.adoptable_animals
with (security_invoker = false)
as
select
  intake.id,
  intake.impound_id,
  intake.animal_type,
  intake.name,
  intake.breed,
  intake.sex,
  intake.age,
  intake.color,
  intake.area,
  coalesce(nullif(btrim(intake.photo_url), ''), nullif(btrim(pet.photo_url), '')) as photo_url
from public.impounds as intake
left join public.pets as pet on pet.pet_id = intake.pet_id
where intake.adoption_status = 'available'
  and intake.impound_status = 'impounded';

create or replace function public.submit_owner_adoption(p_impound_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid := (select auth.uid());
  intake public.impounds%rowtype;
  application_reference text;
begin
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = owner_id and profile.role = 'owner'
      and profile.approval_status = 'approved' and profile.is_active
      and profile.account_deleted_at is null
  ) then
    raise insufficient_privilege using message = 'Sign in with an active owner account to apply for adoption.';
  end if;

  select * into intake from public.impounds where id = p_impound_id for no key update;
  if not found then
    raise exception 'This animal is no longer available for adoption.';
  end if;

  select application.application_id into application_reference
  from public.adoption_applications as application
  where application.applicant_id = owner_id and application.impound_record_id = p_impound_id
    and application.status in ('pending', 'approved', 'completed')
  order by application.created_at desc limit 1;
  if found then
    return application_reference;
  end if;

  if intake.impound_status <> 'impounded' or intake.adoption_status <> 'available' then
    raise exception 'This animal is no longer available for adoption.';
  end if;

  insert into public.adoption_applications (application_id, applicant_id, impound_record_id, application_date)
  values ('AD-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 12)), owner_id, p_impound_id, (now() at time zone 'Asia/Manila')::date)
  returning application_id into application_reference;

  return application_reference;
end;
$$;

revoke all on function public.submit_owner_adoption(uuid) from public, anon, authenticated;
grant execute on function public.submit_owner_adoption(uuid) to authenticated;
