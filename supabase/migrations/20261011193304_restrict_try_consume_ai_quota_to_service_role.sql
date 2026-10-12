-- Mitigation: try_consume_ai_quota(p_user, p_tokens) does not verify auth.uid(),
-- so any authenticated caller could consume another user's AI quota.
-- Restrict execution to trusted server-side service_role. Reversible with GRANT.
REVOKE EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) TO service_role;
