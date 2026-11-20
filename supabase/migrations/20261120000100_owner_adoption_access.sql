alter table public.adoption_applications
  add column if not exists pet_name text,
  add column if not exists pet_species text,
  add column if not exists pet_breed text;

update public.adoption_applications as application
set pet_name = impound.name,
    pet_species = impound.animal_type,
    pet_breed = impound.breed
from public.impounds as impound
where application.impound_record_id = impound.id
  and application.pet_name is null;

create or replace function public.owner_can_apply_to_impound(target_impound_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as profile
    join public.impounds as impound on impound.id = target_impound_id
    where profile.id = (select auth.uid())
      and profile.role = 'owner'
      and profile.approval_status = 'approved'
      and impound.adoption_status = 'available'
      and impound.impound_status = 'impounded'
  );
$$;

revoke all on function public.owner_can_apply_to_impound(uuid) from public, anon;
grant execute on function public.owner_can_apply_to_impound(uuid) to authenticated;

drop policy if exists "Owners can view their adoption applications" on public.adoption_applications;
create policy "Owners can view their adoption applications"
  on public.adoption_applications
  for select
  to authenticated
  using ((select auth.uid()) = applicant_id);

drop policy if exists "Owners can apply for available impounds" on public.adoption_applications;
create policy "Owners can apply for available impounds"
  on public.adoption_applications
  for insert
  to authenticated
  with check (
    applicant_id = (select auth.uid())
    and status = 'pending'
    and decision_date is null
    and public.owner_can_apply_to_impound(impound_record_id)
  );

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
    and impound_status = 'impounded';

  if new.pet_name is null then
    raise exception 'This animal is no longer available for adoption.';
  end if;
  return new;
end;
$$;

revoke all on function public.snapshot_adoption_pet() from public, anon, authenticated;

drop trigger if exists snapshot_pet_for_adoption on public.adoption_applications;
create trigger snapshot_pet_for_adoption
  before insert on public.adoption_applications
  for each row execute procedure public.snapshot_adoption_pet();

create or replace view public.adoptable_animals
with (security_invoker = false)
as
select
  id,
  impound_id,
  animal_type,
  name,
  breed,
  sex,
  age,
  color,
  area
from public.impounds
where adoption_status = 'available'
  and impound_status = 'impounded';

revoke all on public.adoptable_animals from public, anon;
grant select on public.adoptable_animals to authenticated;