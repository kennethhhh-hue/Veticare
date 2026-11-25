alter policy "Personnel can look up approved pets"
  on public.pets
  using (
    public.is_veticare_personnel()
    and status = 'approved'
    and pet_id is not null
    and qr_code is not null
  );

alter policy "Personnel can create scans for issued pets"
  on public.personnel_scans
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and scanned_by = (select auth.uid())
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_scans.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.qr_code is not null
    )
  );

alter policy "Personnel can create verifications for issued pets"
  on public.personnel_verifications
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and verified_by = (select auth.uid())
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_verifications.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.qr_code is not null
    )
  );

alter policy "Personnel can read open review flags for issued pets"
  on public.personnel_review_flags
  using (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and status = 'open'
    and exists (
      select 1 from public.pets as pet
      where pet.id = personnel_review_flags.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.qr_code is not null
    )
  );

alter policy "Personnel can create review flags for issued pets"
  on public.personnel_review_flags
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

alter policy "Personnel can report issued pets"
  on public.personnel_impound_reports
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
        and pet.qr_code is not null
    )
  );

create or replace function public.notify_owner_pet_approved()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    insert into public.notifications (
      recipient_id,
      pet_record_id,
      notification_type,
      title,
      message
    )
    values (
      new.owner_id,
      new.id,
      'pet_approved',
      new.name || ' has been approved',
      'Your pet registration is approved. Your QR code is ready in your digital Pet ID in Veticare. Pet ID: ' || coalesce(new.pet_id, 'available in your Veticare account') || '.'
    )
    on conflict (recipient_id, pet_record_id, notification_type) do nothing;
  end if;
  return new;
end;
$$;

update public.notifications
set message = replace(message, 'You can pick up the collar with its RFID tag at OCVAS. Bring your Pet ID: ', 'Your QR code is ready in your digital Pet ID in Veticare. Pet ID: ')
where notification_type = 'pet_approved'
  and strpos(message, 'You can pick up the collar with its RFID tag at OCVAS. Bring your Pet ID: ') > 0;
