create table public.personnel_scans (
  id uuid primary key default gen_random_uuid(),
  pet_record_id uuid not null references public.pets (id) on delete restrict,
  scanned_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  result text not null check (result in ('verified', 'flagged', 'expired', 'unregistered')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create table public.personnel_verifications (
  id uuid primary key default gen_random_uuid(),
  pet_record_id uuid not null references public.pets (id) on delete restrict,
  verified_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.personnel_review_flags (
  id uuid primary key default gen_random_uuid(),
  pet_record_id uuid not null references public.pets (id) on delete restrict,
  reported_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  scan_id uuid references public.personnel_scans (id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete restrict,
  check (
    (status = 'open' and resolved_at is null and resolved_by is null)
    or (status = 'resolved' and resolved_at is not null and resolved_by is not null)
  )
);

create index personnel_scans_scanned_by_created_at_idx
  on public.personnel_scans (scanned_by, created_at desc);
create index personnel_scans_pet_record_id_idx
  on public.personnel_scans (pet_record_id);
create index personnel_scans_created_at_idx
  on public.personnel_scans (created_at desc);
create index personnel_verifications_verified_by_created_at_idx
  on public.personnel_verifications (verified_by, created_at desc);
create index personnel_verifications_pet_record_id_idx
  on public.personnel_verifications (pet_record_id);
create index personnel_verifications_created_at_idx
  on public.personnel_verifications (created_at desc);
create unique index personnel_review_flags_open_pet_unique
  on public.personnel_review_flags (pet_record_id) where status = 'open';
create index personnel_review_flags_created_at_idx
  on public.personnel_review_flags (created_at desc);
create index personnel_review_flags_scan_id_idx
  on public.personnel_review_flags (scan_id) where scan_id is not null;

alter table public.personnel_scans enable row level security;
alter table public.personnel_verifications enable row level security;
alter table public.personnel_review_flags enable row level security;

revoke all on public.personnel_scans, public.personnel_verifications, public.personnel_review_flags
  from public, anon, authenticated;
grant select on public.personnel_scans, public.personnel_verifications, public.personnel_review_flags
  to authenticated;
grant insert (pet_record_id, result, note) on public.personnel_scans to authenticated;
grant insert (pet_record_id) on public.personnel_verifications to authenticated;
grant insert (pet_record_id, scan_id) on public.personnel_review_flags to authenticated;

create policy "Admins can read personnel scans"
  on public.personnel_scans for select to authenticated
  using ((select public.is_veticare_admin()));

create policy "Personnel can read their scans"
  on public.personnel_scans for select to authenticated
  using (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and scanned_by = (select auth.uid())
  );

create policy "Personnel can create scans for issued pets"
  on public.personnel_scans for insert to authenticated
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and scanned_by = (select auth.uid())
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_scans.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.rfid_tag is not null
        and pet.qr_code is not null
    )
  );

create policy "Admins can read personnel verifications"
  on public.personnel_verifications for select to authenticated
  using ((select public.is_veticare_admin()));

create policy "Personnel can read their verifications"
  on public.personnel_verifications for select to authenticated
  using (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and verified_by = (select auth.uid())
  );

create policy "Personnel can create verifications for issued pets"
  on public.personnel_verifications for insert to authenticated
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and verified_by = (select auth.uid())
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_verifications.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.rfid_tag is not null
        and pet.qr_code is not null
    )
  );

create policy "Admins can read personnel review flags"
  on public.personnel_review_flags for select to authenticated
  using ((select public.is_veticare_admin()));

create policy "Personnel can read open review flags for issued pets"
  on public.personnel_review_flags for select to authenticated
  using (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and status = 'open'
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_review_flags.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.rfid_tag is not null
        and pet.qr_code is not null
    )
  );

create policy "Personnel can create review flags for issued pets"
  on public.personnel_review_flags for insert to authenticated
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and reported_by = (select auth.uid())
    and status = 'open'
    and resolved_at is null
    and resolved_by is null
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_review_flags.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.rfid_tag is not null
        and pet.qr_code is not null
    )
    and (
      scan_id is null
      or exists (
        select 1 from public.personnel_scans as scan
        where scan.id = personnel_review_flags.scan_id
          and scan.pet_record_id = personnel_review_flags.pet_record_id
          and scan.scanned_by = (select auth.uid())
      )
    )
  );

create function public.resolve_personnel_review_flag(p_flag_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (select public.is_veticare_admin()) then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  update public.personnel_review_flags
  set status = 'resolved', resolved_at = now(), resolved_by = (select auth.uid())
  where id = p_flag_id and status = 'open';

  return found;
end;
$$;

revoke all on function public.resolve_personnel_review_flag(uuid) from public, anon, authenticated;
grant execute on function public.resolve_personnel_review_flag(uuid) to authenticated;