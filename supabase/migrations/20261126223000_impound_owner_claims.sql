alter table public.impounds
  add column if not exists claimed_pet_record_id uuid references public.pets(id) on delete set null;

alter table public.pets
  add column if not exists impound_claimed_at timestamptz;

drop policy if exists "Only admins can submit claim history" on public.pets;
create policy "Only admins can submit claim history"
  on public.pets as restrictive for insert to authenticated
  with check (impound_claimed_at is null or public.is_veticare_admin());

-- The old adoption trigger used "claimed" for an active adoption application.
-- A legacy claim without such an application is a separate outcome.
update public.impounds as intake
set impound_status = 'impounded'
where intake.impound_status = 'claimed'
  and intake.adoption_status = 'pending'
  and intake.claimed_pet_record_id is null
  and exists (
    select 1 from public.adoption_applications as application
    where application.impound_record_id = intake.id and application.status in ('pending', 'approved')
  );

with matched_claims as (
  select intake.id, intake.updated_at, pet.id as pet_record_id
  from public.impounds as intake
  join public.pets as pet on pet.pet_id = intake.pet_id and pet.species = intake.animal_type
  where intake.impound_status = 'claimed' and intake.claimed_pet_record_id is null
), linked_claims as (
  update public.impounds as intake
  set claimed_pet_record_id = matched.pet_record_id, adoption_status = 'not_available'
  from matched_claims as matched
  where intake.id = matched.id
  returning matched.pet_record_id, matched.updated_at
)
update public.pets as pet
set impound_claimed_at = greatest(pet.impound_claimed_at, history.claimed_at)
from (
  select pet_record_id, max(updated_at) as claimed_at from linked_claims group by pet_record_id
) as history
where pet.id = history.pet_record_id;

update public.impounds
set adoption_status = 'not_available'
where impound_status = 'claimed' and adoption_status <> 'not_available';

alter table public.impounds
  add constraint claimed_impounds_unavailable_for_adoption
  check (impound_status <> 'claimed' or adoption_status = 'not_available');

create or replace function public.sync_adoption_impound_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  intake_status text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select impound_status into strict intake_status
  from public.impounds where id = new.impound_record_id for no key update;

  if intake_status = 'claimed' then
    if tg_op = 'INSERT' or new.status <> 'rejected' then
      raise exception 'This animal was claimed by its owner.';
    end if;
  elsif tg_op = 'INSERT' or new.status in ('pending', 'approved') then
    update public.impounds
    set adoption_status = 'pending', status = case when status = 'kennel' then 'reserved' else status end
    where id = new.impound_record_id;
  elsif new.status = 'completed' then
    update public.impounds
    set adoption_status = 'adopted', impound_status = 'released'
    where id = new.impound_record_id;
  elsif new.status = 'rejected' then
    update public.impounds
    set adoption_status = 'available', impound_status = 'impounded', status = 'kennel'
    where id = new.impound_record_id;
  end if;

  if tg_op = 'UPDATE' and new.status in ('approved', 'rejected', 'completed') then
    insert into public.notifications (recipient_id, notification_type, title, message)
    values (
      new.applicant_id,
      'adoption_' || new.status,
      case new.status
        when 'approved' then 'Adoption application approved'
        when 'rejected' then 'Adoption application update'
        else 'Adoption completed'
      end,
      case
        when intake_status = 'claimed' then 'Adoption application ' || new.application_id || ' was closed because the animal was claimed by its owner.'
        when new.status = 'approved' then 'Your adoption application ' || new.application_id || ' was approved. OCVAS will coordinate the pet pickup.'
        when new.status = 'rejected' then 'Your adoption application ' || new.application_id || ' was not approved. Please contact OCVAS for details.'
        else 'The adoption for application ' || new.application_id || ' has been recorded as complete.'
      end
    );
  end if;
  return new;
end;
$$;

-- Close any active applications attached to legacy claims still marked claimed.
update public.adoption_applications as application
set status = 'rejected', decision_date = (now() at time zone 'Asia/Manila')::date
from public.impounds as intake
where intake.id = application.impound_record_id and intake.impound_status = 'claimed'
  and application.status in ('pending', 'approved');

create or replace function public.find_impound_claim_pets(p_impound_id uuid, p_search text)
returns table (pet_record_id uuid, pet_name text, pet_id text, breed text, owner_name text, owner_email text, barangay text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_veticare_admin()) then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  return query
  select pet.id, pet.name, pet.pet_id, pet.breed, owner.full_name, owner.email, owner.barangay
  from public.impounds as intake
  join public.pets as pet on pet.id = intake.claimed_pet_record_id
    or (intake.claimed_pet_record_id is null and pet.species = intake.animal_type)
  join public.profiles as owner on owner.id = pet.owner_id and owner.role = 'owner'
  where intake.id = p_impound_id
    and (
      pet.id = intake.claimed_pet_record_id
      or (
        owner.is_active and owner.account_deleted_at is null
        and (
          pet.pet_id = intake.pet_id
          or (
            char_length(btrim(p_search)) >= 2
            and strpos(lower(concat_ws(' ', pet.name, pet.pet_id, pet.breed, owner.full_name, owner.email, owner.barangay)), lower(btrim(p_search))) > 0
            and not exists (select 1 from public.pets as linked where linked.pet_id = intake.pet_id)
          )
        )
      )
    )
  order by (pet.pet_id = intake.pet_id) desc nulls last, pet.name, pet.id
  limit 25;
end;
$$;

create or replace function public.claim_impound(p_impound_id uuid, p_pet_record_id uuid)
returns setof public.impounds
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  intake public.impounds%rowtype;
  claim_time timestamptz := now();
begin
  if not (select public.is_veticare_admin()) then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  select * into intake from public.impounds where id = p_impound_id for no key update;
  if not found then
    raise exception 'The impound record could not be found.';
  end if;
  if intake.impound_status = 'claimed' and intake.claimed_pet_record_id = p_pet_record_id then
    return next intake;
    return;
  end if;
  if intake.adoption_status = 'adopted' or (
    intake.impound_status <> 'impounded'
    and not (intake.impound_status = 'claimed' and intake.claimed_pet_record_id is null)
  ) then
    raise exception 'This impound record is already closed.';
  end if;

  perform 1
  from public.pets as pet
  join public.profiles as owner on owner.id = pet.owner_id and owner.role = 'owner'
  where pet.id = p_pet_record_id and pet.species = intake.animal_type
    and owner.is_active and owner.account_deleted_at is null
    and not exists (
      select 1 from public.pets as linked where linked.pet_id = intake.pet_id and linked.id <> pet.id
    )
  for no key update of pet;
  if not found then
    raise exception 'Select the matching pet profile of an active owner.';
  end if;

  -- Adoption decisions lock the application first. Retry if one is already in progress.
  perform 1 from public.adoption_applications
  where impound_record_id = p_impound_id and status in ('pending', 'approved')
  for no key update nowait;

  update public.impounds
  set impound_status = 'claimed', adoption_status = 'not_available', claimed_pet_record_id = p_pet_record_id
  where id = p_impound_id returning * into intake;

  update public.adoption_applications
  set status = 'rejected', decision_date = (claim_time at time zone 'Asia/Manila')::date
  where impound_record_id = p_impound_id and status in ('pending', 'approved');

  update public.pets
  set impound_claimed_at = greatest(impound_claimed_at, claim_time)
  where id = p_pet_record_id;
  return next intake;
exception
  when lock_not_available then
    raise exception 'An adoption decision is being saved. Refresh the impound record and try again.';
end;
$$;

revoke all on function public.find_impound_claim_pets(uuid, text) from public, anon, authenticated;
grant execute on function public.find_impound_claim_pets(uuid, text) to authenticated;
revoke all on function public.claim_impound(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_impound(uuid, uuid) to authenticated;

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

  select * into report from public.personnel_impound_reports
  where id = p_report_id and status = 'pending' for update;
  if not found then
    return false;
  end if;

  select * into strict pet from public.pets where id = report.pet_record_id for no key update;
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
    where intake.pet_id = pet.pet_id and intake.impound_status = 'impounded'
  );

  update public.personnel_impound_reports
  set status = 'reviewed', reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = report.id;

  return true;
end;
$$;
