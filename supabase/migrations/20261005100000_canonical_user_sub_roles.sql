-- Canonical RBAC reconciliation: user_sub_roles is the sole application role source.
-- The historical user_roles table is preserved for migration lineage only.

create table if not exists public.user_sub_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  constraint user_sub_roles_user_role_key unique (user_id, role)
);

insert into public.user_sub_roles (user_id, role, created_at)
select user_id, role, created_at
from public.user_roles
on conflict (user_id, role) do nothing;

alter table public.user_sub_roles enable row level security;

drop policy if exists "Users view own sub roles" on public.user_sub_roles;
create policy "Users view own sub roles"
on public.user_sub_roles for select
to authenticated
using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "Admins manage sub roles" on public.user_sub_roles;
create policy "Admins manage sub roles"
on public.user_sub_roles for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_sub_roles
    where user_id = _user_id
      and role = _role
  );
$$;

revoke all on table public.user_sub_roles from anon;
revoke insert, update, delete, truncate, references, trigger on table public.user_sub_roles from authenticated;
grant select on table public.user_sub_roles to authenticated;
grant select, insert, update, delete on table public.user_sub_roles to service_role;

revoke execute on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
