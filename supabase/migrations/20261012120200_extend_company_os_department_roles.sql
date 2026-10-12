-- Extend the existing canonical app_role enum for Company OS departmental roles.
-- Keep user_sub_roles as the single role-assignment source. Values are additive.
alter type public.app_role add value if not exists 'finance_manager';
alter type public.app_role add value if not exists 'product_manager';
alter type public.app_role add value if not exists 'operations_manager';
alter type public.app_role add value if not exists 'community_manager';
alter type public.app_role add value if not exists 'market_intelligence_lead';
alter type public.app_role add value if not exists 'control_officer';
