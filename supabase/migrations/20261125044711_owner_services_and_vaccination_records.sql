create table public.owner_service_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id),
  pet_record_id uuid not null references public.pets(id),
  request_type text not null check (request_type in ('visit', 'pet-detail-change', 'annual-registration', 'free-vaccination')),
  preferred_date date,
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'submitted' check (status in ('submitted', 'completed', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  check (
    (request_type = 'pet-detail-change' and details ~ '[^[:space:]]' and preferred_date is null)
    or (request_type = 'visit' and preferred_date is not null)
    or request_type in ('annual-registration', 'free-vaccination')
  ),
  check (preferred_date is null or preferred_date >= (created_at at time zone 'Asia/Manila')::date),
  check (
    (status = 'submitted' and reviewed_at is null and reviewed_by is null)
    or (status in ('completed', 'declined') and reviewed_at is not null and reviewed_by is not null)
  )
);

create index owner_service_requests_owner_date_idx on public.owner_service_requests (owner_id, created_at desc);
create index owner_service_requests_pet_idx on public.owner_service_requests (pet_record_id);
create index owner_service_requests_open_idx on public.owner_service_requests (created_at) where status = 'submitted';
create unique index owner_service_requests_duplicate_open_idx on public.owner_service_requests
  (owner_id, pet_record_id, request_type, coalesce(preferred_date, '-infinity'::date), md5(btrim(details)))
  where status = 'submitted';

alter table public.owner_service_requests enable row level security;
grant select on public.owner_service_requests to authenticated;
grant insert (pet_record_id, request_type, preferred_date, details) on public.owner_service_requests to authenticated;

create policy "Admins can read owner service requests"
  on public.owner_service_requests for select to authenticated
  using ((select public.is_veticare_admin()));

create policy "Owners can read their service requests"
  on public.owner_service_requests for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_veticare_user_active()));

create policy "Approved owners can submit requests for their pets"
  on public.owner_service_requests for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_veticare_user_active())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'owner' and approval_status = 'approved'
    )
    and exists (
      select 1 from public.pets
      where id = owner_service_requests.pet_record_id and owner_id = (select auth.uid())
    )
  );

create function public.review_owner_service_request(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reviewed_request public.owner_service_requests;
  request_label text;
begin
  if not (select public.is_veticare_admin()) then
    raise insufficient_privilege using message = 'Administrator access required.';
  end if;
  if p_status is null or p_status not in ('completed', 'declined') then
    raise invalid_parameter_value using message = 'Choose completed or declined.';
  end if;

  update public.owner_service_requests
  set status = p_status, reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = p_request_id and status = 'submitted'
  returning * into reviewed_request;
  if not found then return false; end if;

  request_label := case reviewed_request.request_type
    when 'visit' then 'Vet visit'
    when 'pet-detail-change' then 'Pet detail change'
    when 'annual-registration' then 'Annual registration'
    else 'Free vaccination'
  end;

  insert into public.notifications (recipient_id, notification_type, title, message)
  values (
    reviewed_request.owner_id,
    'owner_service_request_' || p_status,
    request_label || ' request ' || p_status,
    'Your ' || lower(request_label) || ' request for ' ||
      (select name from public.pets where id = reviewed_request.pet_record_id) ||
      ' was marked ' || p_status || '.'
  );
  return true;
end;
$$;

revoke all on function public.review_owner_service_request(uuid, text) from public, anon, authenticated;
grant execute on function public.review_owner_service_request(uuid, text) to authenticated;

create table public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_record_id uuid not null references public.pets(id),
  vaccine_name text not null check (char_length(vaccine_name) between 1 and 120 and vaccine_name ~ '[^[:space:]]'),
  administered_on date not null,
  recorded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  check (administered_on between date '0001-01-01' and (created_at at time zone 'Asia/Manila')::date)
);

create unique index pet_vaccinations_name_date_idx
  on public.pet_vaccinations (pet_record_id, lower(btrim(vaccine_name)), administered_on);
create index pet_vaccinations_pet_date_idx on public.pet_vaccinations (pet_record_id, administered_on desc);

alter table public.pet_vaccinations enable row level security;
grant select on public.pet_vaccinations to authenticated;
grant insert (pet_record_id, vaccine_name, administered_on) on public.pet_vaccinations to authenticated;

create policy "Admins can record vaccinations"
  on public.pet_vaccinations for insert to authenticated
  with check ((select public.is_veticare_admin()) and recorded_by = (select auth.uid()));

create policy "Authorized users can read pet vaccination records"
  on public.pet_vaccinations for select to authenticated
  using (
    (select public.is_veticare_user_active())
    and exists (select 1 from public.pets where id = pet_vaccinations.pet_record_id)
  );

-- Also initialize capacity on deployments where the original settings migration was skipped.
create table if not exists public.shelter_settings (
  id boolean primary key default true check (id),
  kennel_capacity integer not null default 24 check (kennel_capacity > 0),
  updated_at timestamptz not null default now()
);
insert into public.shelter_settings (id, kennel_capacity) values (true, 24) on conflict (id) do nothing;
alter table public.shelter_settings enable row level security;
grant select, update (kennel_capacity, updated_at) on public.shelter_settings to authenticated;
drop policy if exists "Admins can read shelter settings" on public.shelter_settings;
create policy "Admins can read shelter settings" on public.shelter_settings for select to authenticated
  using ((select public.is_veticare_admin()));
create policy "Admins can update shelter capacity" on public.shelter_settings for update to authenticated
  using ((select public.is_veticare_admin())) with check ((select public.is_veticare_admin()));
