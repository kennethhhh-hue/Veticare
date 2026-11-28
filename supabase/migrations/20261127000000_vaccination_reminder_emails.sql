alter table public.pet_vaccinations
  add column next_due_on date check (next_due_on > administered_on);

create index pet_vaccinations_next_due_idx
  on public.pet_vaccinations (next_due_on) where next_due_on is not null;

grant insert (next_due_on), update (next_due_on) on public.pet_vaccinations to authenticated;

create policy "Active admins can edit next vaccination dates"
  on public.pet_vaccinations for update to authenticated
  using ((select public.is_veticare_admin()) and (select public.is_veticare_user_active()))
  with check ((select public.is_veticare_admin()) and (select public.is_veticare_user_active()));

alter table public.owner_notification_emails
  drop constraint owner_notification_emails_kind_check,
  drop constraint owner_notification_emails_kind_event_id_key,
  add column vaccination_due_on date,
  add constraint owner_notification_emails_kind_check check (
    (kind in ('impound', 'registration') and vaccination_due_on is null)
    or (kind in ('vaccination_due', 'vaccination_overdue') and vaccination_due_on is not null)
  ),
  add constraint owner_notification_emails_event_key unique nulls not distinct (kind, event_id, vaccination_due_on);

create or replace function public.queue_owner_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_kind text := tg_argv[0];
  impound_date date;
begin
  if event_kind = 'impound' then
    impound_date := new.date_impounded;
  end if;

  insert into public.owner_notification_emails (kind, event_id, pet_id, owner_id, impounded_on)
  select event_kind, new.id, pet.id, pet.owner_id, impound_date
  from public.pets pet
  where pet.id = new.pet_record_id
    and pet.owner_id is not null
  on conflict do nothing;

  return new;
end;
$$;

create function public.is_latest_pet_vaccination(vaccination public.pet_vaccinations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1
    from public.pet_vaccinations as newer
    where newer.pet_record_id = vaccination.pet_record_id
      and lower(btrim(newer.vaccine_name)) = lower(btrim(vaccination.vaccine_name))
      and newer.administered_on > vaccination.administered_on
  );
$$;

revoke all on function public.is_latest_pet_vaccination(public.pet_vaccinations) from public, anon, authenticated;

create function public.queue_vaccination_reminder_emails()
returns void
language sql
set search_path = ''
as $$
  with clock as (select (now() at time zone 'Asia/Manila')::date as today)
  insert into public.owner_notification_emails as queued (kind, event_id, pet_id, owner_id, vaccination_due_on)
  select case when vaccination.next_due_on < clock.today then 'vaccination_overdue' else 'vaccination_due' end,
         vaccination.id, pet.id, pet.owner_id, vaccination.next_due_on
  from public.pet_vaccinations as vaccination
  cross join clock
  join public.pets as pet on pet.id = vaccination.pet_record_id and pet.status = 'approved'
  join public.profiles as owner on owner.id = pet.owner_id
    and owner.role = 'owner' and owner.is_active and owner.account_deleted_at is null
  join auth.users as account on account.id = owner.id
    and account.email_confirmed_at is not null and account.deleted_at is null
    and nullif(btrim(account.email), '') is not null
    and account.raw_user_meta_data -> 'vaccination_email_reminders' is distinct from 'false'::jsonb
  where vaccination.next_due_on <= clock.today + 5
    and public.is_latest_pet_vaccination(vaccination)
  on conflict on constraint owner_notification_emails_event_key do update
    set owner_id = excluded.owner_id, status = 'pending', created_at = now(),
        next_attempt_at = now(), last_error = null, claim_token = null, send_started_at = null
    where queued.status = 'skipped';
$$;

revoke all on function public.queue_vaccination_reminder_emails() from public, anon, authenticated;

drop function public.claim_owner_notification_emails();

create function public.claim_owner_notification_emails()
returns table (
  id uuid, claim_token uuid, kind text, pet_name text, email text, impounded_on date, vaccination_due_on date, vaccine_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  -- A send interrupted after it started may have reached Gmail already.
  update public.owner_notification_emails as queued
  set status = 'failed', last_error = 'gmail_delivery_unconfirmed', claim_token = null
  where queued.status = 'pending' and queued.next_attempt_at <= now()
    and queued.send_started_at is not null;

  update public.owner_notification_emails as queued
  set status = 'failed', last_error = coalesce(queued.last_error, 'queue_expired'), claim_token = null
  where queued.status = 'pending' and queued.next_attempt_at <= now()
    and queued.created_at <= now() - interval '23 hours';

  return query
  with next_batch as (
    select queued.id
    from public.owner_notification_emails as queued
    where queued.status = 'pending'
      and queued.next_attempt_at <= now()
      and queued.created_at > now() - interval '23 hours'
      and queued.send_started_at is null
    order by queued.next_attempt_at, queued.id
    limit 4
    for update skip locked
  ), claimed as (
    update public.owner_notification_emails as queued
    set next_attempt_at = now() + interval '5 minutes', claim_token = gen_random_uuid()
    from next_batch
    where queued.id = next_batch.id
    returning queued.*
  )
  select claimed.id, claimed.claim_token, claimed.kind, pet.name,
         nullif(btrim(account.email), ''), claimed.impounded_on, claimed.vaccination_due_on, vaccination.vaccine_name
  from claimed
  join public.pets as pet on pet.id = claimed.pet_id
  left join public.profiles as owner on owner.id = claimed.owner_id
    and owner.role = 'owner' and owner.is_active and owner.account_deleted_at is null
    and pet.owner_id = owner.id
  left join public.pet_vaccinations as vaccination on claimed.kind in ('vaccination_due', 'vaccination_overdue')
    and vaccination.id = claimed.event_id and vaccination.pet_record_id = pet.id
  left join auth.users as account on account.id = owner.id
    and account.email_confirmed_at is not null and account.deleted_at is null
    and (
      claimed.kind = 'impound'
      or (claimed.kind = 'registration' and pet.status = 'approved' and (
        pet.pet_id_status = 'expired'
        or pet.pet_id_valid_through < today
      ))
      or (pet.status = 'approved'
        and account.raw_user_meta_data -> 'vaccination_email_reminders' is distinct from 'false'::jsonb
        and vaccination.next_due_on = claimed.vaccination_due_on
        and public.is_latest_pet_vaccination(vaccination)
        and case claimed.kind
          when 'vaccination_due' then vaccination.next_due_on between today and today + 5
          when 'vaccination_overdue' then vaccination.next_due_on < today
          else false
        end
      )
    );
end;
$$;

revoke all on function public.claim_owner_notification_emails() from public, anon, authenticated;
grant execute on function public.claim_owner_notification_emails() to service_role;

select cron.schedule('queue-vaccination-reminder-emails', '15 * * * *',
  'select public.queue_vaccination_reminder_emails()');
