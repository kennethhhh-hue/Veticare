create table public.personnel_impound_reports (
  id uuid primary key default gen_random_uuid(),
  pet_record_id uuid not null references public.pets (id) on delete restrict,
  reported_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  location_found text not null check (char_length(location_found) between 1 and 200 and location_found ~ '[^[:space:]]'),
  date_impounded date not null check (date_impounded <= (now() at time zone 'Asia/Manila')::date),
  reason text not null check (char_length(reason) between 1 and 400 and reason ~ '[^[:space:]]'),
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete restrict,
  check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status = 'reviewed' and reviewed_at is not null and reviewed_by is not null)
  )
);

create index personnel_impound_reports_reported_by_created_at_idx
  on public.personnel_impound_reports (reported_by, created_at desc);
create index personnel_impound_reports_status_created_at_idx
  on public.personnel_impound_reports (status, created_at desc);
create index personnel_impound_reports_pet_record_id_idx
  on public.personnel_impound_reports (pet_record_id);
create index personnel_impound_reports_reviewed_by_idx
  on public.personnel_impound_reports (reviewed_by) where reviewed_by is not null;

alter table public.personnel_impound_reports enable row level security;

revoke all on public.personnel_impound_reports from public, anon, authenticated;
grant select on public.personnel_impound_reports to authenticated;
grant insert (pet_record_id, location_found, date_impounded, reason)
  on public.personnel_impound_reports to authenticated;

create policy "Admins can read personnel impound reports"
  on public.personnel_impound_reports for select to authenticated
  using ((select public.is_veticare_admin()));

create policy "Personnel can read their impound reports"
  on public.personnel_impound_reports for select to authenticated
  using (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and reported_by = (select auth.uid())
  );

create policy "Personnel can report issued pets"
  on public.personnel_impound_reports for insert to authenticated
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and reported_by = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_impound_reports.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.rfid_tag is not null
        and pet.qr_code is not null
    )
  );

create function public.mark_personnel_impound_report_reviewed(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_veticare_admin()) then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  update public.personnel_impound_reports
  set status = 'reviewed', reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = p_report_id and status = 'pending';

  return found;
end;
$$;

revoke all on function public.mark_personnel_impound_report_reviewed(uuid) from public, anon, authenticated;
grant execute on function public.mark_personnel_impound_report_reviewed(uuid) to authenticated;