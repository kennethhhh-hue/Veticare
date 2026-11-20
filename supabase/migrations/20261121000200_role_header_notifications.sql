alter table public.notifications
  add column if not exists source_activity_id uuid references public.admin_activity (id) on delete cascade;

create unique index if not exists notifications_source_activity_unique
  on public.notifications (recipient_id, source_activity_id)
  where source_activity_id is not null;

drop policy if exists "Admins can read their notifications" on public.notifications;
create policy "Admins can read their notifications"
  on public.notifications
  for select
  to authenticated
  using (
    (select auth.uid()) = recipient_id
    and public.is_veticare_admin()
  );

drop policy if exists "Personnel can read their notifications" on public.notifications;
create policy "Personnel can read their notifications"
  on public.notifications
  for select
  to authenticated
  using (
    (select auth.uid()) = recipient_id
    and public.is_veticare_personnel()
  );

drop policy if exists "Admins can mark their notifications read" on public.notifications;
create policy "Admins can mark their notifications read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id and public.is_veticare_admin())
  with check ((select auth.uid()) = recipient_id and public.is_veticare_admin());

drop policy if exists "Personnel can mark their notifications read" on public.notifications;
create policy "Personnel can mark their notifications read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id and public.is_veticare_personnel())
  with check ((select auth.uid()) = recipient_id and public.is_veticare_personnel());

create or replace function public.notify_staff_of_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  v_message text;
begin
  v_title := case new.event_type
    when 'pet_submitted' then 'New pet registration'
    when 'pet_approved' then 'Pet registration approved'
    when 'pet_rejected' then 'Pet registration rejected'
    when 'impound_logged' then 'New impound record'
    when 'adoption_submitted' then 'New adoption application'
    when 'adoption_approved' then 'Adoption approved'
    when 'adoption_rejected' then 'Adoption application rejected'
    when 'adoption_completed' then 'Adoption completed'
    else 'Veticare activity update'
  end;
  v_message := new.actor_name || ' ' || new.action || ' ' || new.target || '.';

  insert into public.notifications (
    recipient_id,
    pet_record_id,
    notification_type,
    title,
    message,
    source_activity_id
  )
  select
    profile.id,
    case when new.entity_type = 'pets' then new.entity_id else null end,
    'admin_activity',
    v_title,
    v_message,
    new.id
  from public.profiles as profile
  where profile.role = 'admin'
     or (profile.role = 'personnel' and new.event_type in ('pet_approved', 'impound_logged'))
  on conflict (recipient_id, source_activity_id)
    where source_activity_id is not null
    do nothing;

  return new;
end;
$$;

revoke all on function public.notify_staff_of_activity() from public, anon, authenticated;

drop trigger if exists notify_staff_after_admin_activity on public.admin_activity;
create trigger notify_staff_after_admin_activity
  after insert on public.admin_activity
  for each row execute procedure public.notify_staff_of_activity();

insert into public.notifications (
  recipient_id,
  pet_record_id,
  notification_type,
  title,
  message,
  source_activity_id
)
select
  profile.id,
  case when activity.entity_type = 'pets' then activity.entity_id else null end,
  'admin_activity',
  case activity.event_type
    when 'pet_submitted' then 'New pet registration'
    when 'pet_approved' then 'Pet registration approved'
    when 'pet_rejected' then 'Pet registration rejected'
    when 'impound_logged' then 'New impound record'
    when 'adoption_submitted' then 'New adoption application'
    when 'adoption_approved' then 'Adoption approved'
    when 'adoption_rejected' then 'Adoption application rejected'
    when 'adoption_completed' then 'Adoption completed'
    else 'Veticare activity update'
  end,
  activity.actor_name || ' ' || activity.action || ' ' || activity.target || '.',
  activity.id
from public.admin_activity as activity
cross join public.profiles as profile
where profile.role = 'admin'
   or (profile.role = 'personnel' and activity.event_type in ('pet_approved', 'impound_logged'))
on conflict (recipient_id, source_activity_id)
  where source_activity_id is not null
  do nothing;

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