alter table public.owner_notification_emails add column send_started_at timestamptz;
grant update (send_started_at) on public.owner_notification_emails to service_role;

create function public.start_owner_notification_send(p_id uuid, p_claim_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.owner_notification_emails
  set send_started_at = now()
  where id = p_id and claim_token = p_claim_token and status = 'pending'
    and send_started_at is null and next_attempt_at > now();

  return found;
end;
$$;

revoke all on function public.start_owner_notification_send(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_owner_notification_send(uuid, uuid) to service_role;

create or replace function public.claim_owner_notification_emails()
returns table (
  id uuid, claim_token uuid, kind text, pet_name text, email text, impounded_on date
)
language plpgsql
security definer
set search_path = ''
as $$
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
