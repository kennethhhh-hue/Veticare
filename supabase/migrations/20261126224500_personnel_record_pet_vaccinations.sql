drop policy if exists "Active personnel can record vaccinations for issued pets" on public.pet_vaccinations;
create policy "Active personnel can record vaccinations for issued pets"
  on public.pet_vaccinations for insert to authenticated
  with check (
    (select public.is_veticare_user_active())
    and (select public.is_veticare_personnel())
    and recorded_by = (select auth.uid())
    and exists (
      select 1 from public.pets as pet
      where pet.id = pet_vaccinations.pet_record_id
        and pet.status = 'approved'
        and pet.pet_id is not null
        and pet.qr_code is not null
    )
  );
