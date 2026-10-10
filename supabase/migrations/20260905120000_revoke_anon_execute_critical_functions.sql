-- P23 critical security hardening
--
-- Supabase Advisor references:
--   0028/0029: anon/authenticated executable SECURITY DEFINER functions
--   0010: SECURITY DEFINER views
--   0002: auth.users exposed through a view
--   0011: mutable function search_path
--
-- Before/after summary:
--   * BUY/SELL RPCs: revoke anon and PUBLIC; grant authenticated (body review below).
--   * Cash adjustment: revoke anon and PUBLIC; preserve service_role only.
--   * AI quota: revoke anon and PUBLIC; grant authenticated.
--   * Account lifecycle/internal hooks: revoke anon, authenticated, and PUBLIC.
--   * Reporting views: set SECURITY INVOKER so querying-role RLS applies.
--   * Compliance view: revoke anon SELECT.
--   * Mutable search_path functions: pin to public, pg_temp.
--   * pg_net and pg_trgm remain in public intentionally deferred to a separately tested migration.
--
-- Critical follow-up findings:
--   * upsert_holding_buy, upsert_holding_sell, and adjust_cash_balance currently
--     accept p_user_id without checking auth.uid() = p_user_id. Restricting grants
--     does not fix authenticated-user IDOR; these transaction bodies require a
--     dedicated reviewed follow-up change.

REVOKE EXECUTE ON FUNCTION public.upsert_holding_buy(uuid, text, integer, numeric) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_holding_buy(uuid, text, integer, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.upsert_holding_sell(uuid, text, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_holding_sell(uuid, text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.adjust_cash_balance(uuid, numeric) FROM anon, PUBLIC;
-- adjust_cash_balance is called only by the server-side portfolio transaction path.
REVOKE EXECUTE ON FUNCTION public.adjust_cash_balance(uuid, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_cash_balance(uuid, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) TO authenticated;

DO $migration$
DECLARE
  signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.permanently_delete_user(uuid)',
    'public.restore_user(uuid)',
    'public.soft_delete_user()',
    'public.anonymize_user_data(uuid)',
    'public.add_role_to_jwt()',
    'public.audit_feature_flag_changes()',
    'public.rls_auto_enable()',
    'public.archive_old_data(integer)',
    'public.cleanup_expired_deletion_codes()',
    'public.cleanup_expired_exports()'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated, PUBLIC', signature);
    END IF;
  END LOOP;
END;
$migration$;












ALTER VIEW public.active_users SET (security_invoker = true);
ALTER VIEW public.active_holdings SET (security_invoker = true);
ALTER VIEW public.active_transactions SET (security_invoker = true);
ALTER VIEW public.v_idx_latest_prices SET (security_invoker = true);
ALTER VIEW public.v_idx_screener SET (security_invoker = true);
ALTER VIEW public.v_idx_index_performance SET (security_invoker = true);

REVOKE SELECT ON public.data_compliance_status FROM anon;

DO $migration$
DECLARE
  signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.upsert_holding_sell(uuid, text, integer)',
    'public.restore_user(uuid)',
    'public.permanently_delete_user(uuid)',
    'public.soft_delete_user()',
    'public.archive_old_data(integer)',
    'public.add_role_to_jwt()',
    'public.try_consume_ai_quota(uuid, integer)',
    'public.audit_feature_flag_changes()',
    'public.cleanup_expired_deletion_codes()',
    'public.anonymize_user_data(uuid)',
    'public.cleanup_expired_exports()'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', signature);
    END IF;
  END LOOP;
END;
$migration$;
