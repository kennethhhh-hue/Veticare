create table if not exists public.adoption_applications (
  id uuid primary key default gen_random_uuid(),
  application_id text not null unique,
  applicant_id uuid not null references public.profiles (id) on delete restrict,
  impound_record_id uuid not null references public.impounds (id) on delete restrict,
  application_date date not null default current_date,
  decision_date date,
  home_visit_status text not null default 'pending'
    check (home_visit_status in ('pending', 'scheduled', 'passed')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'completed', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists adoption_applications_active_impound_unique
  on public.adoption_applications (impound_record_id)
  where status in ('pending', 'approved');

create index if not exists adoption_applications_created_at_idx
  on public.adoption_applications (created_at desc);

alter table public.adoption_applications enable row level security;
grant select, insert, update on public.adoption_applications to authenticated;

drop policy if exists "Admins can view adoption applications" on public.adoption_applications;
create policy "Admins can view adoption applications"
  on public.adoption_applications
  for select
  to authenticated
  using (public.is_veticare_admin());

drop policy if exists "Admins can create adoption applications" on public.adoption_applications;
create policy "Admins can create adoption applications"
  on public.adoption_applications
  for insert
  to authenticated
  with check (public.is_veticare_admin());

drop policy if exists "Admins can update adoption applications" on public.adoption_applications;
create policy "Admins can update adoption applications"
  on public.adoption_applications
  for update
  to authenticated
  using (public.is_veticare_admin())
  with check (public.is_veticare_admin());

create or replace function public.sync_adoption_impound_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.impounds
    set adoption_status = 'pending',
        status = case when status = 'kennel' then 'reserved' else status end
    where id = new.impound_record_id;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'completed' then
      update public.impounds
      set adoption_status = 'adopted', impound_status = 'released'
      where id = new.impound_record_id;
    elsif new.status = 'rejected' then
      update public.impounds
      set adoption_status = 'available', impound_status = 'impounded', status = 'kennel'
      where id = new.impound_record_id;
    elsif new.status in ('pending', 'approved') then
      update public.impounds
      set adoption_status = case when new.status = 'approved' then 'pending' else 'pending' end,
          impound_status = 'claimed',
          status = case when status = 'kennel' then 'reserved' else status end
      where id = new.impound_record_id;
    end if;

    if new.status in ('approved', 'rejected', 'completed') then
      insert into public.notifications (recipient_id, notification_type, title, message)
      values (
        new.applicant_id,
        'adoption_' || new.status,
        case new.status
          when 'approved' then 'Adoption application approved'
          when 'rejected' then 'Adoption application update'
          else 'Adoption completed'
        end,
        case new.status
          when 'approved' then 'Your adoption application ' || new.application_id || ' was approved. OCVAS will coordinate the pet pickup.'
          when 'rejected' then 'Your adoption application ' || new.application_id || ' was not approved. Please contact OCVAS for details.'
          else 'The adoption for application ' || new.application_id || ' has been recorded as complete.'
        end
      );
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_adoption_impound_status() from public, anon, authenticated;

drop trigger if exists sync_impound_after_adoption_insert on public.adoption_applications;
create trigger sync_impound_after_adoption_insert
  after insert on public.adoption_applications
  for each row execute procedure public.sync_adoption_impound_status();

drop trigger if exists sync_impound_after_adoption_update on public.adoption_applications;
create trigger sync_impound_after_adoption_update
  after update of status on public.adoption_applications
  for each row execute procedure public.sync_adoption_impound_status();

drop trigger if exists set_adoption_updated_at on public.adoption_applications;
create trigger set_adoption_updated_at
  before update on public.adoption_applications
  for each row execute procedure public.set_impound_updated_at();