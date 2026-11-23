drop policy if exists "Require valid pet submission" on public.pets;

create policy "Require valid pet submission"
  on public.pets
  as restrictive
  for insert
  to authenticated
  with check (
    public.is_veticare_admin()
    or (
      owner_id = (select auth.uid())
      and status = 'pending'
      and pet_id is null
      and rfid_tag is null
      and qr_code is null
      and pet_id_status = 'pending'
      and pet_id_issued_at is null
      and pet_id_valid_through is null
      and approved_at is null
      and exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'owner'
          and profiles.approval_status = 'approved'
          and profiles.is_active = true
      )
    )
  );