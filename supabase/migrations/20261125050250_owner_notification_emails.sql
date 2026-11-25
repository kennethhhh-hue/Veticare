create table public.owner_notification_emails (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('impound', 'registration')),
  event_id uuid not null,
  pet_id uuid not null references public.pets (id) on delete cascade,
  owner_id uuid not null,
  impounded_on date,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  last_error text,
  unique (kind, event_id)
);

create index owner_notification_emails_pending_idx
  on public.owner_notification_emails (next_attempt_at, id) where status = 'pending';
create index owner_notification_emails_pet_id_idx on public.owner_notification_emails (pet_id);

alter table public.owner_notification_emails enable row level security;
revoke all on public.owner_notification_emails from public, anon, authenticated, service_role;
grant select (id, claim_token), update (status, last_error)
  on public.owner_notification_emails to service_role;

create function public.queue_owner_notification_email()
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
  on conflict (kind, event_id) do nothing;

  return new;
end;
$$;

revoke all on function public.queue_owner_notification_email() from public, anon, authenticated, service_role;

create trigger queue_impound_owner_email
  after insert on public.personnel_impound_reports
  for each row execute function public.queue_owner_notification_email('impound');

create trigger queue_registration_owner_email
  after insert on public.personnel_review_flags
  for each row when (new.request_type = 'registration' and new.status = 'open')
  execute function public.queue_owner_notification_email('registration');

create function public.claim_owner_notification_emails()
returns table (
  id uuid, claim_token uuid, kind text, pet_name text, email text, impounded_on date
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Resend retains idempotency keys for 24 hours. End retries before a key can expire.
  update public.owner_notification_emails as queued
  set status = 'failed', last_error = coalesce(queued.last_error, 'queue_expired')
  where queued.status = 'pending'
    and queued.created_at <= now() - interval '23 hours'
    and queued.next_attempt_at <= now();

  return query
  with next_batch as (
    select queued.id
    from public.owner_notification_emails as queued
    where queued.status = 'pending'
      and queued.next_attempt_at <= now()
      and queued.created_at > now() - interval '23 hours'
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
         nullif(btrim(account.email), ''), claimed.impounded_on
  from claimed
  join public.pets as pet on pet.id = claimed.pet_id
  left join public.profiles as owner on owner.id = claimed.owner_id
    and owner.role = 'owner' and owner.is_active and owner.account_deleted_at is null
    and pet.owner_id = owner.id
  left join auth.users as account on account.id = owner.id
    and account.email_confirmed_at is not null and account.deleted_at is null
    and (
      claimed.kind = 'impound'
      or (pet.status = 'approved' and (
        pet.pet_id_status = 'expired'
        or pet.pet_id_valid_through < (now() at time zone 'Asia/Manila')::date
      ))
    );
end;
$$;

revoke all on function public.claim_owner_notification_emails() from public, anon, authenticated;
grant execute on function public.claim_owner_notification_emails() to service_role;
