-- Harden AI quota reservations against cross-user calls and concurrent over-reservation.
-- This migration is intentionally reviewed through PR/CI before any production application.

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_status_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_status_check
  CHECK (status IN ('success', 'error', 'reserved', 'completed', 'billed'));

CREATE OR REPLACE FUNCTION public.try_consume_ai_quota(p_user uuid, p_tokens integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  daily_limit bigint := 50000;
  monthly_limit bigint := 500000;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  current_daily bigint := 0;
  current_monthly bigint := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'p_tokens must be a positive integer' USING ERRCODE = '22023';
  END IF;

  -- Serialize all quota checks/reservations for the same caller.
  PERFORM pg_advisory_xact_lock(hashtext(p_user::text));

  -- Aggregate form always returns one row, including when the user has no subscription.
  SELECT COALESCE(MAX(s.daily_limit), 50000),
         COALESCE(MAX(s.monthly_limit), 500000)
    INTO daily_limit, monthly_limit
    FROM public.subscriptions AS s
   WHERE s.user_id = p_user;

  -- Count both completed usage and outstanding reservations so parallel requests
  -- cannot all pass against the same remaining quota.
  SELECT COALESCE(SUM(l.total_tokens), 0)
    INTO current_daily
    FROM public.ai_usage_logs AS l
   WHERE l.user_id = p_user
     AND l.created_at >= day_start
     AND l.status IN ('success', 'completed', 'billed', 'reserved');

  SELECT COALESCE(SUM(l.total_tokens), 0)
    INTO current_monthly
    FROM public.ai_usage_logs AS l
   WHERE l.user_id = p_user
     AND l.created_at >= month_start
     AND l.status IN ('success', 'completed', 'billed', 'reserved');

  IF current_daily + p_tokens > daily_limit
     OR current_monthly + p_tokens > monthly_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_usage_logs
    (user_id, model, input_tokens, output_tokens, total_tokens, cost_usd, operation, status)
  VALUES
    (p_user, 'quota_reserve', p_tokens, 0, p_tokens, 0, 'quota_reserve', 'reserved');

  RETURN TRUE;
END;
$function$;

REVOKE ALL ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) TO authenticated, service_role;
