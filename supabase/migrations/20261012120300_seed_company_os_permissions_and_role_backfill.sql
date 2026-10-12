-- Conservative Company OS permission matrix seed.
-- This catalog is metadata until application/API/RLS enforcement explicitly consumes it.
-- Never use this table alone as proof of authorization.
insert into public.role_permissions (role, permission_code) values
 ('user'::public.app_role, 'profile.read_own'),
 ('user'::public.app_role, 'portfolio.read_own'),
 ('user'::public.app_role, 'portfolio.write_own'),
 ('user'::public.app_role, 'market.read_published'),
 ('user'::public.app_role, 'community.read_entitled'),
 ('advisor'::public.app_role, 'profile.read_own'),
 ('advisor'::public.app_role, 'customer.read_assigned'),
 ('advisor'::public.app_role, 'customer.manage_assigned'),
 ('portfolio_advisor'::public.app_role, 'profile.read_own'),
 ('portfolio_advisor'::public.app_role, 'customer.read_assigned'),
 ('portfolio_advisor'::public.app_role, 'customer.manage_assigned'),
 ('equity_analyst'::public.app_role, 'market.read_published'),
 ('equity_analyst'::public.app_role, 'research.read_internal'),
 ('research_analyst'::public.app_role, 'market.read_published'),
 ('research_analyst'::public.app_role, 'research.read_internal'),
 ('data_analyst'::public.app_role, 'market.read_published'),
 ('data_analyst'::public.app_role, 'research.read_internal'),
 ('customer_support'::public.app_role, 'operations.manage'),
 ('operations_manager'::public.app_role, 'operations.manage'),
 ('community_manager'::public.app_role, 'community.read_entitled'),
 ('market_intelligence_lead'::public.app_role, 'market.read_published'),
 ('market_intelligence_lead'::public.app_role, 'research.read_internal'),
 ('finance_manager'::public.app_role, 'finance.read'),
 ('finance_manager'::public.app_role, 'finance.reconcile'),
 ('product_manager'::public.app_role, 'product.manage'),
 ('engineer'::public.app_role, 'technology.manage'),
 ('control_officer'::public.app_role, 'governance.audit'),
 ('admin'::public.app_role, 'profile.read_own'),
 ('admin'::public.app_role, 'portfolio.read_own'),
 ('admin'::public.app_role, 'portfolio.write_own'),
 ('admin'::public.app_role, 'market.read_published'),
 ('admin'::public.app_role, 'community.read_entitled'),
 ('admin'::public.app_role, 'customer.read_assigned'),
 ('admin'::public.app_role, 'customer.manage_assigned'),
 ('admin'::public.app_role, 'research.read_internal'),
 ('admin'::public.app_role, 'operations.manage'),
 ('admin'::public.app_role, 'finance.read'),
 ('admin'::public.app_role, 'finance.reconcile'),
 ('admin'::public.app_role, 'product.manage'),
 ('admin'::public.app_role, 'technology.manage'),
 ('admin'::public.app_role, 'access.manage'),
 ('admin'::public.app_role, 'governance.audit'),
 ('super_admin'::public.app_role, 'profile.read_own'),
 ('super_admin'::public.app_role, 'portfolio.read_own'),
 ('super_admin'::public.app_role, 'portfolio.write_own'),
 ('super_admin'::public.app_role, 'market.read_published'),
 ('super_admin'::public.app_role, 'community.read_entitled'),
 ('super_admin'::public.app_role, 'customer.read_assigned'),
 ('super_admin'::public.app_role, 'customer.manage_assigned'),
 ('super_admin'::public.app_role, 'research.read_internal'),
 ('super_admin'::public.app_role, 'operations.manage'),
 ('super_admin'::public.app_role, 'finance.read'),
 ('super_admin'::public.app_role, 'finance.reconcile'),
 ('super_admin'::public.app_role, 'product.manage'),
 ('super_admin'::public.app_role, 'technology.manage'),
 ('super_admin'::public.app_role, 'access.manage'),
 ('super_admin'::public.app_role, 'governance.audit')
on conflict (role, permission_code) do nothing;

-- Additional account types are backfilled only from existing canonical roles.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'FINANCE', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr where usr.role::text = 'finance_manager'
on conflict (user_id, account_type) do nothing;

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'PRODUCT_GROWTH', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr where usr.role::text = 'product_manager'
on conflict (user_id, account_type) do nothing;

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'OPERATIONS', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr where usr.role::text = 'operations_manager'
on conflict (user_id, account_type) do nothing;

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'COMMUNITY', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr where usr.role::text = 'community_manager'
on conflict (user_id, account_type) do nothing;

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'MARKET_INTELLIGENCE', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr where usr.role::text = 'market_intelligence_lead'
on conflict (user_id, account_type) do nothing;

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'CONTROL', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr where usr.role::text = 'control_officer'
on conflict (user_id, account_type) do nothing;

-- Existing active subscriptions are another explicit signal of CUSTOMER status.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct s.user_id, 'CUSTOMER', 'active', coalesce(s.started_at, s.created_at, now()), now(), now()
from public.subscriptions s
where lower(coalesce(s.status, '')) = 'active'
  and lower(coalesce(s.tier, 'free')) <> 'free'
  and (s.ends_at is null or s.ends_at > now())
on conflict (user_id, account_type) do nothing;
