alter table public.personnel_review_flags
  add column request_type text not null default 'general'
    check (request_type in ('general', 'vaccination', 'registration'));

create unique index personnel_review_flags_open_pet_request_unique
  on public.personnel_review_flags (pet_record_id, request_type)
  where status = 'open';

drop index public.personnel_review_flags_open_pet_unique;

grant insert (request_type) on public.personnel_review_flags to authenticated;

create policy "Registration follow-ups require an expired pet registration"
  on public.personnel_review_flags as restrictive for insert to authenticated
  with check (
    request_type <> 'registration'
    or exists (
      select 1
      from public.pets as pet
      where pet.id = personnel_review_flags.pet_record_id
        and (
          pet.pet_id_status = 'expired'
          or pet.pet_id_valid_through < (now() at time zone 'Asia/Manila')::date
        )
    )
  );
