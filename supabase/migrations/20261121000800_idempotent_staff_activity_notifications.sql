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
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.notify_staff_of_activity() from public, anon, authenticated;