alter table public.impounds add column if not exists vaccine_name text
  check (vaccine_name is null or (vaccinated and char_length(btrim(vaccine_name)) between 1 and 120));

create or replace view public.adoptable_animals
with (security_invoker = false)
as
select
  intake.id, intake.impound_id, intake.animal_type, intake.name, intake.breed,
  intake.sex, intake.age, intake.color, intake.area,
  coalesce(nullif(btrim(intake.photo_url), ''), nullif(btrim(pet.photo_url), '')) as photo_url,
  intake.vaccine_name
from public.impounds as intake
left join public.pets as pet on pet.pet_id = intake.pet_id
where intake.adoption_status = 'available' and intake.impound_status = 'impounded';

create or replace function public.sync_pet_id_issue_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  latest_vaccination date;
begin
  if new.status = 'approved' and new.pet_id is not null then
    if tg_op = 'INSERT' or old.status is distinct from new.status or old.pet_id is distinct from new.pet_id then
      new.pet_id_status := 'active';
      new.pet_id_issued_at := coalesce(new.pet_id_issued_at, today);
    end if;

    if new.pet_id_status <> 'replaced' then
      new.pet_id_issued_at := coalesce(new.pet_id_issued_at, (new.created_at at time zone 'Asia/Manila')::date);
      select max(administered_on) into latest_vaccination
      from public.pet_vaccinations where pet_record_id = new.id;
      new.pet_id_valid_through := (greatest(new.pet_id_issued_at, latest_vaccination) + interval '1 year')::date;
      new.pet_id_status := case when new.pet_id_valid_through < today then 'expired' else 'active' end;
    end if;
  elsif new.status <> 'approved' and new.pet_id_status in ('active', 'expired') then
    new.pet_id_status := 'pending';
    new.pet_id_issued_at := null;
    new.pet_id_valid_through := null;
  end if;
  return new;
end;
$$;

create or replace function public.refresh_pet_id_after_vaccination()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.pets set pet_id_valid_through = pet_id_valid_through
  where id = new.pet_record_id and status = 'approved' and pet_id is not null and pet_id_status <> 'replaced';
  return new;
end;
$$;

revoke all on function public.refresh_pet_id_after_vaccination() from public, anon, authenticated;
drop trigger if exists refresh_pet_id_after_vaccination on public.pet_vaccinations;
create trigger refresh_pet_id_after_vaccination
  after insert on public.pet_vaccinations
  for each row execute function public.refresh_pet_id_after_vaccination();

update public.pets set pet_id_valid_through = pet_id_valid_through
where status = 'approved' and pet_id is not null and pet_id_status <> 'replaced';
