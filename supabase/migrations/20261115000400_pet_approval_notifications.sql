create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  pet_record_id uuid references public.pets (id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_id, pet_record_id, notification_type)
);

alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Owners can read their notifications" on public.notifications;
create policy "Owners can read their notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

drop policy if exists "Owners can mark their notifications read" on public.notifications;
create policy "Owners can mark their notifications read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

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
      'Your pet registration is approved. You can pick up the collar with its RFID tag at OCVAS. Bring your Pet ID: ' || coalesce(new.pet_id, 'available in your Veticare account') || '.'
    )
    on conflict (recipient_id, pet_record_id, notification_type) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_owner_pet_approved() from public, anon, authenticated;

drop trigger if exists notify_owner_after_pet_approval on public.pets;
create trigger notify_owner_after_pet_approval
  after update of status on public.pets
  for each row execute procedure public.notify_owner_pet_approved();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;