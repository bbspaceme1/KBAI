-- Backfill existing identities into the new account-type layer.
-- USER is the baseline account type; additional types are derived only from explicit
-- existing role/membership evidence. No legacy roles are deleted or rewritten.

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select u.id, 'USER', 'active', coalesce(u.created_at, now()), now(), now()
from auth.users u
on conflict (user_id, account_type) do nothing;

-- Advisor-facing roles remain in the existing canonical user_sub_roles table.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'ADVISOR', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr
where usr.role::text in ('advisor', 'portfolio_advisor')
on conflict (user_id, account_type) do nothing;

-- Research and data roles belong to Market Intelligence.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'MARKET_INTELLIGENCE', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr
where usr.role::text in ('equity_analyst', 'research_analyst', 'data_analyst')
on conflict (user_id, account_type) do nothing;

-- Customer support is mapped to Operations; engineering and AI operations to Tech & AI.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'OPERATIONS', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr
where usr.role::text = 'customer_support'
on conflict (user_id, account_type) do nothing;

insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'TECH_AI', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr
where usr.role::text in ('engineer', 'ai_agent')
on conflict (user_id, account_type) do nothing;

-- Administrative identities are mapped to CONTROL; the actual admin role is unchanged.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct usr.user_id, 'CONTROL', 'active', coalesce(usr.created_at, now()), now(), now()
from public.user_sub_roles usr
where usr.role::text in ('admin', 'super_admin')
on conflict (user_id, account_type) do nothing;

-- Active paid memberships are the only evidence used to grant CUSTOMER.
insert into public.user_account_types (user_id, account_type, status, assigned_at, created_at, updated_at)
select distinct m.user_id, 'CUSTOMER', 'active', coalesce(m.started_at, now()), now(), now()
from public.memberships m
where lower(coalesce(m.status, '')) = 'active'
  and lower(coalesce(m.tier, 'free')) <> 'free'
  and (m.expires_at is null or m.expires_at > now())
on conflict (user_id, account_type) do nothing;

-- Community account type requires a concrete existing community membership row.
-- This backfill deliberately does not infer FINANCE or PRODUCT_GROWTH from unrelated roles.
