-- Harden AI quota RPC ownership, token validation, and concurrent reservations.
-- This migration is intentionally staged on the feature branch; it has NOT been
-- applied to any Supabase project. Verify on an isolated database before release.

BEGIN;

CREATE OR REPLACE FUNCTION public.try_consume_ai_quota(p_user uuid, p_tokens integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  daily_limit bigint := 50000;
  monthly_limit bigint := 500000;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'utc');
  month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'utc');
  current_daily bigint := 0;
  current_monthly bigint := 0;
BEGIN
  -- SECURITY DEFINER must never trust a caller-supplied user id.
  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to consume quota for this user'
      USING ERRCODE = '42501';
  END IF;

  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'Token count must be a positive integer'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize reservations per user so concurrent calls cannot overrun limits.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  SELECT COALESCE(s.daily_limit, 50000), COALESCE(s.monthly_limit, 500000)
    INTO daily_limit, monthly_limit
  FROM public.subscriptions s
  WHERE s.user_id = p_user
  LIMIT 1;

  -- SELECT INTO sets targets to NULL when there is no matching subscription.
  IF NOT FOUND THEN
    daily_limit := 50000;
    monthly_limit := 500000;
  END IF;

  SELECT COALESCE(SUM(total_tokens), 0)
    INTO current_daily
  FROM public.ai_usage_logs
  WHERE user_id = p_user
    AND created_at >= day_start
    AND status IN ('success', 'completed', 'billed');

  SELECT COALESCE(SUM(total_tokens), 0)
    INTO current_monthly
  FROM public.ai_usage_logs
  WHERE user_id = p_user
    AND created_at >= month_start
    AND status IN ('success', 'completed', 'billed');

  IF current_daily + p_tokens > daily_limit THEN
    RETURN FALSE;
  END IF;

  IF current_monthly + p_tokens > monthly_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_usage_logs
    (user_id, model, input_tokens, output_tokens, total_tokens, cost_usd, operation, status)
  VALUES
    (p_user, 'quota_reserve', p_tokens, 0, p_tokens, 0, 'quota_reserve', 'success');

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) TO authenticated;

COMMIT;
