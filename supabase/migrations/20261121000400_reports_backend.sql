create table if not exists public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  name text not null,
  category text not null,
  period text not null,
  format text not null default 'CSV' check (format = 'CSV'),
  generated_at timestamptz not null default now(),
  row_count integer not null default 0 check (row_count >= 0),
  status text not null default 'ready' check (status in ('ready', 'failed')),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  report_data jsonb not null default '[]'::jsonb
);

create index if not exists generated_reports_generated_at_idx
  on public.generated_reports (generated_at desc);

alter table public.generated_reports enable row level security;
grant select, insert on public.generated_reports to authenticated;

drop policy if exists "Admins can read generated reports" on public.generated_reports;
create policy "Admins can read generated reports"
  on public.generated_reports
  for select
  to authenticated
  using (public.is_veticare_admin());

drop policy if exists "Admins can create generated reports" on public.generated_reports;
create policy "Admins can create generated reports"
  on public.generated_reports
  for insert
  to authenticated
  with check (public.is_veticare_admin() and author_id = (select auth.uid()));

create or replace function public.log_generated_report()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.admin_activity (entity_type, entity_id, event_type, actor_name, action, target, destination)
  values (
    'generated_reports',
    new.id,
    'report_generated',
    new.author_name,
    'generated a report for',
    new.category || ' (' || new.period || ')',
    '/reports'
  );
  return new;
end;
$$;

revoke all on function public.log_generated_report() from public, anon, authenticated;

drop trigger if exists log_generated_report on public.generated_reports;
create trigger log_generated_report
  after insert on public.generated_reports
  for each row execute procedure public.log_generated_report();