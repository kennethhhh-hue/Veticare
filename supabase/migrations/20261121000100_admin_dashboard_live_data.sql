alter table public.pets
  add column if not exists approved_at timestamptz;

update public.pets
set approved_at = created_at
where status = 'approved'
  and approved_at is null;

create or replace function public.set_pet_approved_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status is distinct from new.status then
      new.approved_at = now();
    else
      new.approved_at = coalesce(new.approved_at, now());
    end if;
  else
    new.approved_at = null;
  end if;
  return new;
end;
$$;

revoke all on function public.set_pet_approved_at() from public, anon, authenticated;

drop trigger if exists set_pet_approved_at on public.pets;
create trigger set_pet_approved_at
  before insert or update on public.pets
  for each row execute procedure public.set_pet_approved_at();

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  actor_name text not null,
  action text not null,
  target text not null,
  destination text not null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, event_type, created_at)
);

create index if not exists admin_activity_created_at_idx
  on public.admin_activity (created_at desc);

alter table public.admin_activity enable row level security;
grant select on public.admin_activity to authenticated;

drop policy if exists "Admins can read dashboard activity" on public.admin_activity;
create policy "Admins can read dashboard activity"
  on public.admin_activity
  for select
  to authenticated
  using (public.is_veticare_admin());

create or replace function public.capture_admin_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor text;
  v_entity_id uuid;
  v_event_type text;
  v_action text;
  v_target text;
  v_destination text;
begin
  select coalesce(full_name, email, 'Veticare user')
  into v_actor
  from public.profiles
  where id = (select auth.uid());
  v_actor := coalesce(v_actor, 'Veticare system');

  if tg_table_name = 'pets' then
    v_entity_id := new.id;
    v_target := new.name;
    v_destination := '/registrations';
    if tg_op = 'INSERT' then
      v_event_type := 'pet_submitted';
      v_action := 'submitted a pet registration for';
    elsif new.status is distinct from old.status then
      v_event_type := 'pet_' || new.status;
      v_action := case new.status
        when 'approved' then 'approved the registration for'
        when 'rejected' then 'rejected the registration for'
        else 'updated the registration for'
      end;
    else
      return new;
    end if;
  elsif tg_table_name = 'impounds' then
    if tg_op <> 'INSERT' then return new; end if;
    v_entity_id := new.id;
    v_event_type := 'impound_logged';
    v_action := 'logged an impound for';
    v_target := new.name;
    v_destination := '/impounded-dogs';
  elsif tg_table_name = 'adoption_applications' then
    v_entity_id := new.id;
    v_target := coalesce(new.pet_name, new.application_id);
    v_destination := '/adoptions';
    if tg_op = 'INSERT' then
      v_event_type := 'adoption_submitted';
      v_action := 'submitted an adoption application for';
    elsif new.status is distinct from old.status then
      v_event_type := 'adoption_' || new.status;
      v_action := case new.status
        when 'approved' then 'approved an adoption application for'
        when 'rejected' then 'rejected an adoption application for'
        when 'completed' then 'completed the adoption of'
        else 'updated an adoption application for'
      end;
    else
      return new;
    end if;
  else
    return new;
  end if;

  insert into public.admin_activity (entity_type, entity_id, event_type, actor_name, action, target, destination)
  values (tg_table_name, v_entity_id, v_event_type, v_actor, v_action, v_target, v_destination);
  return new;
end;
$$;

revoke all on function public.capture_admin_activity() from public, anon, authenticated;

drop trigger if exists log_pet_submission on public.pets;
create trigger log_pet_submission
  after insert on public.pets
  for each row execute procedure public.capture_admin_activity();

drop trigger if exists log_pet_status_change on public.pets;
create trigger log_pet_status_change
  after update of status on public.pets
  for each row execute procedure public.capture_admin_activity();

drop trigger if exists log_impound_creation on public.impounds;
create trigger log_impound_creation
  after insert on public.impounds
  for each row execute procedure public.capture_admin_activity();

drop trigger if exists log_adoption_submission on public.adoption_applications;
create trigger log_adoption_submission
  after insert on public.adoption_applications
  for each row execute procedure public.capture_admin_activity();

drop trigger if exists log_adoption_status_change on public.adoption_applications;
create trigger log_adoption_status_change
  after update of status on public.adoption_applications
  for each row execute procedure public.capture_admin_activity();

insert into public.admin_activity (entity_type, entity_id, event_type, actor_name, action, target, destination, created_at)
select 'pets', pet.id, 'pet_submitted', coalesce(profile.full_name, profile.email, 'Pet owner'), 'submitted a pet registration for', pet.name, '/registrations', pet.created_at
from public.pets as pet
left join public.profiles as profile on profile.id = pet.owner_id
where not exists (
  select 1 from public.admin_activity as activity
  where activity.entity_type = 'pets' and activity.entity_id = pet.id and activity.event_type = 'pet_submitted'
);

insert into public.admin_activity (entity_type, entity_id, event_type, actor_name, action, target, destination, created_at)
select 'impounds', impound.id, 'impound_logged', 'OCVAS', 'logged an impound for', impound.name, '/impounded-dogs', impound.created_at
from public.impounds as impound
where not exists (
  select 1 from public.admin_activity as activity
  where activity.entity_type = 'impounds' and activity.entity_id = impound.id and activity.event_type = 'impound_logged'
);

insert into public.admin_activity (entity_type, entity_id, event_type, actor_name, action, target, destination, created_at)
select 'adoption_applications', application.id, 'adoption_submitted', coalesce(profile.full_name, profile.email, 'Pet owner'), 'submitted an adoption application for', coalesce(application.pet_name, application.application_id), '/adoptions', application.created_at
from public.adoption_applications as application
left join public.profiles as profile on profile.id = application.applicant_id
where not exists (
  select 1 from public.admin_activity as activity
  where activity.entity_type = 'adoption_applications' and activity.entity_id = application.id and activity.event_type = 'adoption_submitted'
);

insert into public.admin_activity (entity_type, entity_id, event_type, actor_name, action, target, destination, created_at)
select
  'adoption_applications',
  application.id,
  'adoption_' || application.status,
  'OCVAS',
  case application.status
    when 'approved' then 'approved an adoption application for'
    when 'rejected' then 'rejected an adoption application for'
    when 'completed' then 'completed the adoption of'
  end,
  coalesce(application.pet_name, application.application_id),
  '/adoptions',
  application.decision_date::timestamp at time zone 'Asia/Manila'
from public.adoption_applications as application
where application.status in ('approved', 'rejected', 'completed')
  and application.decision_date is not null
  and not exists (
    select 1 from public.admin_activity as activity
    where activity.entity_type = 'adoption_applications'
      and activity.entity_id = application.id
      and activity.event_type = 'adoption_' || application.status
  );

create or replace function public.get_admin_dashboard_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_month_start date;
  v_previous_month_start date;
  v_data jsonb;
begin
  if not public.is_veticare_admin() then
    raise exception 'Admin access required';
  end if;

  v_month_start := date_trunc('month', v_today)::date;
  v_previous_month_start := (v_month_start - interval '1 month')::date;

  with months as (
    select (date_trunc('month', v_today)::date - (offset_month * interval '1 month'))::date as month_start
    from generate_series(0, 11) as month_offsets(offset_month)
  ),
  pet_counts as (
    select months.month_start, count(pets.id)::integer as amount
    from months
    left join public.pets as pets
      on pets.status = 'approved'
      and (pets.approved_at at time zone 'Asia/Manila')::date >= months.month_start
      and (pets.approved_at at time zone 'Asia/Manila')::date < (months.month_start + interval '1 month')::date
    group by months.month_start
  ),
  pending_counts as (
    select months.month_start, count(pets.id)::integer as amount
    from months
    left join public.pets as pets
      on pets.status = 'pending'
      and (pets.created_at at time zone 'Asia/Manila')::date >= months.month_start
      and (pets.created_at at time zone 'Asia/Manila')::date < (months.month_start + interval '1 month')::date
    group by months.month_start
  ),
  owner_counts as (
    select months.month_start, count(profiles.id)::integer as amount
    from months
    left join public.profiles as profiles
      on profiles.role = 'owner'
      and (profiles.created_at at time zone 'Asia/Manila')::date >= months.month_start
      and (profiles.created_at at time zone 'Asia/Manila')::date < (months.month_start + interval '1 month')::date
    group by months.month_start
  ),
  adoption_counts as (
    select months.month_start, count(applications.id)::integer as amount
    from months
    left join public.adoption_applications as applications
      on applications.status = 'completed'
      and applications.decision_date >= months.month_start
      and applications.decision_date < (months.month_start + interval '1 month')::date
    group by months.month_start
  ),
  totals as (
    select
      (select count(*)::integer from public.pets where status = 'approved') as registered,
      (select count(*)::integer from public.pets where status = 'pending') as pending,
      (select count(*)::integer from public.profiles where role = 'owner') as owners,
      (select count(*)::integer from public.adoption_applications where status = 'completed') as completed_adoptions,
      (select count(*)::integer from public.adoption_applications where status = 'pending') as pending_adoptions,
      (select count(*)::integer from public.pets where status = 'approved' and (approved_at at time zone 'Asia/Manila')::date >= v_month_start) as registered_this_month,
      (select count(*)::integer from public.pets where status = 'approved' and (approved_at at time zone 'Asia/Manila')::date >= v_previous_month_start and (approved_at at time zone 'Asia/Manila')::date < v_month_start) as registered_last_month,
      (select count(*)::integer from public.pets where status = 'pending' and (created_at at time zone 'Asia/Manila')::date >= v_month_start) as pending_this_month,
      (select count(*)::integer from public.pets where status = 'pending' and (created_at at time zone 'Asia/Manila')::date >= v_previous_month_start and (created_at at time zone 'Asia/Manila')::date < v_month_start) as pending_last_month,
      (select count(*)::integer from public.profiles where role = 'owner' and (created_at at time zone 'Asia/Manila')::date >= v_month_start) as owners_this_month,
      (select count(*)::integer from public.profiles where role = 'owner' and (created_at at time zone 'Asia/Manila')::date >= v_previous_month_start and (created_at at time zone 'Asia/Manila')::date < v_month_start) as owners_last_month,
      (select count(*)::integer from public.adoption_applications where status = 'completed' and decision_date >= v_month_start) as adoptions_this_month,
      (select count(*)::integer from public.adoption_applications where status = 'completed' and decision_date >= v_previous_month_start and decision_date < v_month_start) as adoptions_last_month
  )
  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'pets', jsonb_build_object('value', totals.registered, 'caption', totals.registered_this_month || ' approved this month', 'delta', case when totals.registered_last_month = 0 then case when totals.registered_this_month = 0 then 0 else 100 end else round(((totals.registered_this_month - totals.registered_last_month)::numeric / totals.registered_last_month) * 100, 1) end),
      'pending', jsonb_build_object('value', totals.pending, 'caption', 'Awaiting review', 'delta', case when totals.pending_last_month = 0 then case when totals.pending_this_month = 0 then 0 else 100 end else round(((totals.pending_this_month - totals.pending_last_month)::numeric / totals.pending_last_month) * 100, 1) end),
      'owners', jsonb_build_object('value', totals.owners, 'caption', totals.owners_this_month || ' new this month', 'delta', case when totals.owners_last_month = 0 then case when totals.owners_this_month = 0 then 0 else 100 end else round(((totals.owners_this_month - totals.owners_last_month)::numeric / totals.owners_last_month) * 100, 1) end),
      'adoptions', jsonb_build_object('value', totals.completed_adoptions, 'caption', totals.pending_adoptions || ' applications in review', 'delta', case when totals.adoptions_last_month = 0 then case when totals.adoptions_this_month = 0 then 0 else 100 end else round(((totals.adoptions_this_month - totals.adoptions_last_month)::numeric / totals.adoptions_last_month) * 100, 1) end)
    ),
    'series', jsonb_build_object(
      'pets', (select jsonb_agg(amount order by month_start) from pet_counts),
      'pending', (select jsonb_agg(amount order by month_start) from pending_counts),
      'owners', (select jsonb_agg(amount order by month_start) from owner_counts),
      'adoptions', (select jsonb_agg(amount order by month_start) from adoption_counts)
    ),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'actor', actor_name, 'action', action, 'target', target, 'destination', destination, 'type', event_type, 'created_at', created_at) order by created_at desc)
      from (select id, actor_name, action, target, destination, event_type, created_at from public.admin_activity order by created_at desc limit 8) as recent_rows
    ), '[]'::jsonb)
  )
  into v_data
  from totals;

  return v_data;
end;
$$;

revoke all on function public.get_admin_dashboard_data() from public, anon;
grant execute on function public.get_admin_dashboard_data() to authenticated;