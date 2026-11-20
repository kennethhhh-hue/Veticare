create unique index if not exists pets_rfid_tag_normalized_unique
  on public.pets (lower(btrim(rfid_tag)))
  where rfid_tag is not null and btrim(rfid_tag) <> '';

create or replace function public.find_rfid_tag_assignment(
  p_rfid_tag text,
  p_exclude_pet_id uuid default null
)
returns table (pet_id uuid, pet_name text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_veticare_admin() then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;

  return query
    select pets.id, pets.name
    from public.pets
    where lower(btrim(pets.rfid_tag)) = lower(btrim(p_rfid_tag))
      and pets.id <> coalesce(p_exclude_pet_id, '00000000-0000-0000-0000-000000000000'::uuid)
    limit 1;
end;
$$;

revoke all on function public.find_rfid_tag_assignment(text, uuid) from public, anon;
grant execute on function public.find_rfid_tag_assignment(text, uuid) to authenticated;