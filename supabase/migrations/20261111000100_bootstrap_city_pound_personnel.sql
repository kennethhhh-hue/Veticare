create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when lower(new.email) = 'kennethadoyo@gmail.com' then 'admin'
      when lower(new.email) = 'marjes@gmail.com' then 'personnel'
      else 'owner'
    end
  );
  return new;
end;
$$;

insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  case
    when lower(email) = 'kennethadoyo@gmail.com' then 'admin'
    when lower(email) = 'marjes@gmail.com' then 'personnel'
  end
from auth.users
where lower(email) in ('kennethadoyo@gmail.com', 'marjes@gmail.com')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;
