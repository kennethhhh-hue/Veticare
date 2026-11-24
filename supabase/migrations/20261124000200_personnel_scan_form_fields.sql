alter table public.personnel_impound_reports
  alter column reason drop not null;

alter table public.personnel_review_flags
  add column vaccine_name text,
  add constraint personnel_review_flags_vaccine_name_check check (
    vaccine_name is null
    or (
      request_type = 'vaccination'
      and char_length(vaccine_name) between 1 and 120
      and vaccine_name ~ '[^[:space:]]'
    )
  );

grant insert (vaccine_name) on public.personnel_review_flags to authenticated;

create policy "Vaccination follow-ups require a vaccine name"
  on public.personnel_review_flags as restrictive for insert to authenticated
  with check (request_type <> 'vaccination' or vaccine_name is not null);
