alter table public.pets
  add column if not exists pet_id_status text not null default 'pending'
    check (pet_id_status in ('active', 'pending', 'expired', 'replaced')),
  add column if not exists pet_id_issued_at date,
  add column if not exists pet_id_valid_through date;

update public.pets
set pet_id_status = case when status = 'approved' then 'active' else 'pending' end,
    pet_id_issued_at = case when status = 'approved' and pet_id is not null then created_at::date else pet_id_issued_at end,
    pet_id_valid_through = case
      when status = 'approved' and pet_id is not null
        then make_date(extract(year from created_at)::integer, 12, 31)
      else pet_id_valid_through
    end
where pet_id is not null;

create or replace function public.sync_pet_id_issue_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'approved' and new.pet_id is not null then
    if tg_op = 'INSERT' or old.status is distinct from new.status or old.pet_id is distinct from new.pet_id then
      new.pet_id_status = 'active';
      new.pet_id_issued_at = coalesce(new.pet_id_issued_at, current_date);
      new.pet_id_valid_through = coalesce(new.pet_id_valid_through, make_date(extract(year from current_date)::integer, 12, 31));
    end if;
  elsif new.status <> 'approved' and new.pet_id_status = 'active' then
    new.pet_id_status = 'pending';
    new.pet_id_issued_at = null;
    new.pet_id_valid_through = null;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_pet_id_issue_status() from public, anon, authenticated;

drop trigger if exists sync_pet_id_issue_status on public.pets;
create trigger sync_pet_id_issue_status
  before insert or update on public.pets
  for each row execute procedure public.sync_pet_id_issue_status();