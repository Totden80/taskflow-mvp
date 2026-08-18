create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique not null,
  full_name text not null default '',
  role_level integer not null default 3 check (role_level between 0 and 9),
  manager_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','locked','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_manager_id_idx on public.profiles(manager_id);
create index if not exists profiles_role_level_idx on public.profiles(role_level);
create index if not exists task_groups_status_idx on public.task_groups(status);
create index if not exists task_groups_created_by_idx on public.task_groups(created_by);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists task_groups_set_updated_at on public.task_groups;
create trigger task_groups_set_updated_at before update on public.task_groups
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'));
  insert into public.profiles (id, email, username, full_name, role_level)
  values (
    new.id,
    new.email,
    base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when not exists (select 1 from public.profiles) then 0 else 3 end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.task_groups enable row level security;
revoke all on table public.profiles, public.task_groups from anon, authenticated;
grant select on table public.profiles, public.task_groups to authenticated;

drop policy if exists "authenticated users can read profiles" on public.profiles;
create policy "authenticated users can read profiles" on public.profiles
for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists "authenticated users can read groups" on public.task_groups;
create policy "authenticated users can read groups" on public.task_groups
for select to authenticated using ((select auth.uid()) is not null);

