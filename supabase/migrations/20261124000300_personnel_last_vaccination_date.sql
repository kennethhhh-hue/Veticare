alter table public.personnel_review_flags
  add column last_vaccination_date date,
  add constraint personnel_review_flags_last_vaccination_date_check check (
    last_vaccination_date is null
    or (
      request_type = 'vaccination'
      and last_vaccination_date >= date '0001-01-01'
      and last_vaccination_date <= (created_at at time zone 'Asia/Manila')::date
    )
  );

grant insert (last_vaccination_date) on public.personnel_review_flags to authenticated;
