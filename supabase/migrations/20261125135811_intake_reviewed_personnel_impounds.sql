create or replace function public.mark_personnel_impound_report_reviewed(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  report public.personnel_impound_reports%rowtype;
  pet public.pets%rowtype;
begin
  if not (select public.is_veticare_admin()) then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  select * into report
  from public.personnel_impound_reports
  where id = p_report_id and status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  -- Serialize reviews for the same pet before checking for an open intake.
  select * into strict pet
  from public.pets
  where id = report.pet_record_id
  for no key update;

  if nullif(btrim(pet.pet_id), '') is null then
    raise exception 'An issued Pet ID is required to add this report to the impound list.';
  end if;

  insert into public.impounds (
    impound_id, pet_id, animal_type, name, breed, sex, age, color,
    area, impounded_at, adoption_status, notes
  )
  select
    'IMP-' || report.id, pet.pet_id, pet.species, pet.name, pet.breed, pet.sex, pet.age, pet.color,
    report.location_found, report.date_impounded, 'not_available', coalesce(report.reason, '')
  where not exists (
    select 1 from public.impounds as intake
    where intake.pet_id = pet.pet_id and intake.impound_status in ('impounded', 'claimed')
  );

  update public.personnel_impound_reports
  set status = 'reviewed', reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = report.id;

  return true;
end;
$$;

create or replace function public.snapshot_adoption_pet()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select name, animal_type, breed
  into new.pet_name, new.pet_species, new.pet_breed
  from public.impounds
  where id = new.impound_record_id
    and adoption_status = 'available'
    and impound_status = 'impounded'
  for no key update;

  if not found then
    raise exception 'This animal is no longer available for adoption.';
  end if;
  return new;
end;
$$;
