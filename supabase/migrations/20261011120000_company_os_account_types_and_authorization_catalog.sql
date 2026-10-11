-- KBAI Company OS: canonical account-type foundation.
-- Additive migration: preserves existing app_role/user_sub_roles and user data.
-- Account type is distinct from role; Telegram remains an identity provider under USER.

create table if not exists public.account_type_catalog (
  code text primary key,
  label text not null,
  description text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint account_type_catalog_code_check check (
    code in (
      'USER','CUSTOMER','ADVISOR','COMMUNITY','MARKET_INTELLIGENCE',
      'OPERATIONS','FINANCE','PRODUCT_GROWTH','TECH_AI','CONTROL'
    )
  )
);

insert into public.account_type_catalog (code, label, description, is_internal) values
 ('USER','User','General and Telegram-authenticated end users',false),
 ('CUSTOMER','Customer','Paying customers, plans, services and entitlements',false),
 ('ADVISOR','Advisor','Advisors and explicitly assigned client relationships',true),
 ('COMMUNITY','Community','Community membership and group access',true),
 ('MARKET_INTELLIGENCE','Market Intelligence','Market data, research and internal intelligence',true),
 ('OPERATIONS','Operations','Operational workflows and service handling',true),
 ('FINANCE','Finance','Billing, payments, reconciliation and financial reporting',true),
 ('PRODUCT_GROWTH','Product & Growth','Product operations, marketing and growth analytics',true),
 ('TECH_AI','Technology & AI','Engineering, infrastructure and AI operations',true),
 ('CONTROL','Control','Super-admin governance, oversight and company control',true)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  is_internal = excluded.is_internal;

create table if not exists public.user_account_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null references public.account_type_catalog(code) on update cascade on delete restrict,
  status text not null default 'active' check (status in ('pending','active','suspended','revoked')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_account_types_user_type_key unique (user_id, account_type),
  constraint user_account_types_expiry_check check (expires_at is null or expires_at > assigned_at)
);

create index if not exists user_account_types_user_status_idx
  on public.user_account_types (user_id, status, account_type);
create index if not exists user_account_types_type_status_idx
  on public.user_account_types (account_type, status, user_id);

-- Permission catalog is independent of account type and role assignments.
-- This migration seeds a catalog only; it does not grant new operational permissions.
create table if not exists public.permission_catalog (
  code text primary key,
  resource text not null,
  action text not null,
  description text not null,
  risk_level text not null default 'standard'
    check (risk_level in ('standard','sensitive','critical')),
  created_at timestamptz not null default now(),
  constraint permission_catalog_resource_action_key unique (resource, action)
);

insert into public.permission_catalog (code, resource, action, description, risk_level) values
 ('profile.read_own','profile','read_own','Read own profile','standard'),
 ('portfolio.read_own','portfolio','read_own','Read own portfolio','standard'),
 ('portfolio.write_own','portfolio','write_own','Modify own portfolio data','sensitive'),
 ('market.read_published','market','read_published','Read published market data','standard'),
 ('community.read_entitled','community','read_entitled','Read entitled community resources','standard'),
 ('customer.read_assigned','customer','read_assigned','Read explicitly assigned customer records','sensitive'),
 ('customer.manage_assigned','customer','manage_assigned','Manage explicitly assigned customer workflows','sensitive'),
 ('research.read_internal','research','read_internal','Read internal market research','sensitive'),
 ('operations.manage','operations','manage','Manage operational workflows','sensitive'),
 ('finance.read','finance','read','Read financial records','sensitive'),
 ('finance.reconcile','finance','reconcile','Reconcile financial records','critical'),
 ('product.manage','product','manage','Manage product and growth settings','sensitive'),
 ('technology.manage','technology','manage','Manage technical systems','critical'),
 ('access.manage','access','manage','Manage account and access assignments','critical'),
 ('governance.audit','governance','audit','Review security and audit records','critical')
on conflict (code) do update set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  risk_level = excluded.risk_level;

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  permission_code text not null references public.permission_catalog(code) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint role_permissions_role_permission_key unique (role, permission_code)
);

create index if not exists role_permissions_role_idx on public.role_permissions (role, permission_code);

-- Scope assignments represent data boundaries, not additional roles.
create table if not exists public.user_scope_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope_type text not null check (scope_type in ('OWN','ASSIGNED','TEAM','DOMAIN','GLOBAL')),
  scope_key text,
  resource_type text not null,
  resource_id text,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint user_scope_assignments_expiry_check check (expires_at is null or expires_at > created_at)
);

create index if not exists user_scope_assignments_user_resource_idx
  on public.user_scope_assignments (user_id, resource_type, scope_type);
create index if not exists user_scope_assignments_resource_idx
  on public.user_scope_assignments (resource_type, resource_id);

alter table public.account_type_catalog enable row level security;
alter table public.user_account_types enable row level security;
alter table public.permission_catalog enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_scope_assignments enable row level security;

drop policy if exists "Authenticated can read account type catalog" on public.account_type_catalog;
create policy "Authenticated can read account type catalog"
  on public.account_type_catalog for select to authenticated using (true);

drop policy if exists "Users read own account types or admins read all" on public.user_account_types;
create policy "Users read own account types or admins read all"
  on public.user_account_types for select to authenticated
  using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role));

drop policy if exists "Admins manage account type assignments" on public.user_account_types;
create policy "Admins manage account type assignments"
  on public.user_account_types for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role));

drop policy if exists "Authenticated can read permission catalog" on public.permission_catalog;
create policy "Authenticated can read permission catalog"
  on public.permission_catalog for select to authenticated using (true);

drop policy if exists "Authenticated can read role permissions" on public.role_permissions;
create policy "Authenticated can read role permissions"
  on public.role_permissions for select to authenticated using (true);

drop policy if exists "Admins manage role permissions" on public.role_permissions;
create policy "Admins manage role permissions"
  on public.role_permissions for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role));

drop policy if exists "Users read own scopes or admins read all" on public.user_scope_assignments;
create policy "Users read own scopes or admins read all"
  on public.user_scope_assignments for select to authenticated
  using ((select auth.uid()) = user_id or public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role));

drop policy if exists "Admins manage scope assignments" on public.user_scope_assignments;
create policy "Admins manage scope assignments"
  on public.user_scope_assignments for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'super_admin'::public.app_role));

revoke all on public.account_type_catalog, public.permission_catalog, public.role_permissions,
  public.user_account_types, public.user_scope_assignments from anon;
grant select on public.account_type_catalog, public.permission_catalog, public.role_permissions to authenticated;
grant select, insert, update, delete on public.user_account_types, public.user_scope_assignments to authenticated;
grant insert, update, delete on public.role_permissions to authenticated;
grant all on public.account_type_catalog, public.permission_catalog, public.role_permissions,
  public.user_account_types, public.user_scope_assignments to service_role;
