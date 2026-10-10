-- Harden AI quota enforcement with caller-bound atomic reservations.
-- Staged on this feature branch only; not applied to any Supabase project.
BEGIN;

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_status_check;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_status_check
  CHECK (status IN ('success', 'error', 'completed', 'billed', 'reserved'));

CREATE OR REPLACE FUNCTION public.reserve_ai_quota(p_user uuid, p_tokens integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $reserve$
DECLARE
  daily_limit bigint := 50000;
  monthly_limit bigint := 500000;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  current_daily bigint := 0;
  current_monthly bigint := 0;
  reservation_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to reserve quota for this user'
      USING ERRCODE = '42501';
  END IF;

  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'Token count must be a positive integer'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  SELECT COALESCE(s.daily_limit, 50000), COALESCE(s.monthly_limit, 500000)
    INTO daily_limit, monthly_limit
  FROM public.subscriptions s
  WHERE s.user_id = p_user
  LIMIT 1;

  IF NOT FOUND THEN
    daily_limit := 50000;
    monthly_limit := 500000;
  END IF;

  -- Include pending reservations as well as finalized usage. Finalization
  -- updates the same row, so actual usage is counted exactly once.
  SELECT COALESCE(SUM(total_tokens), 0)
    INTO current_daily
  FROM public.ai_usage_logs
  WHERE user_id = p_user
    AND created_at >= day_start
    AND status IN ('success', 'completed', 'billed', 'reserved');

  SELECT COALESCE(SUM(total_tokens), 0)
    INTO current_monthly
  FROM public.ai_usage_logs
  WHERE user_id = p_user
    AND created_at >= month_start
    AND status IN ('success', 'completed', 'billed', 'reserved');

  IF current_daily + p_tokens > daily_limit
     OR current_monthly + p_tokens > monthly_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.ai_usage_logs
    (user_id, model, input_tokens, output_tokens, total_tokens, cost_usd, operation, status)
  VALUES
    (p_user, 'quota_reserve', p_tokens, 0, p_tokens, 0, 'quota_reserve', 'reserved')
  RETURNING id INTO reservation_id;

  RETURN reservation_id;
END;
$reserve$;

CREATE OR REPLACE FUNCTION public.finalize_ai_quota_reservation(
  p_reservation_id uuid,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_usd numeric,
  p_operation text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $finalize$
DECLARE
  affected_rows integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to finalize quota'
      USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('success', 'error') THEN
    RAISE EXCEPTION 'Invalid AI usage status'
      USING ERRCODE = '22023';
  END IF;

  IF p_status = 'success'
     AND (p_input_tokens IS NULL OR p_input_tokens < 0
       OR p_output_tokens IS NULL OR p_output_tokens < 0
       OR p_cost_usd IS NULL OR p_cost_usd < 0) THEN
    RAISE EXCEPTION 'Invalid finalized AI usage values'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.ai_usage_logs
  SET model = COALESCE(NULLIF(p_model, ''), 'unknown'),
      input_tokens = CASE WHEN p_status = 'success' THEN p_input_tokens ELSE 0 END,
      output_tokens = CASE WHEN p_status = 'success' THEN p_output_tokens ELSE 0 END,
      total_tokens = CASE WHEN p_status = 'success' THEN p_input_tokens + p_output_tokens ELSE 0 END,
      cost_usd = CASE WHEN p_status = 'success' THEN p_cost_usd ELSE 0 END,
      operation = COALESCE(NULLIF(p_operation, ''), 'ai_gateway'),
      status = p_status,
      error_message = CASE
        WHEN p_status = 'error' THEN LEFT(COALESCE(p_error_message, 'AI request failed'), 1000)
        ELSE NULL
      END
  WHERE id = p_reservation_id
    AND user_id = auth.uid()
    AND operation = 'quota_reserve'
    AND status = 'reserved';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Quota reservation not found, already finalized, or not owned by caller'
      USING ERRCODE = '42501';
  END IF;

  RETURN TRUE;
END;
$finalize$;

-- Compatibility RPC for one-shot consumers: a successful call consumes quota
-- immediately. The AI gateway uses reserve_ai_quota + finalization instead.
CREATE OR REPLACE FUNCTION public.try_consume_ai_quota(p_user uuid, p_tokens integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $consume$
DECLARE
  reservation_id uuid;
  affected_rows integer;
BEGIN
  -- Keep the ownership invariant explicit in this public compatibility RPC as
  -- well as in reserve_ai_quota. This also protects against future changes to
  -- the delegated implementation and makes the security contract auditable.
  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to consume quota for this user'
      USING ERRCODE = '42501';
  END IF;

  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'Token count must be a positive integer'
      USING ERRCODE = '22023';
  END IF;

  reservation_id := public.reserve_ai_quota(p_user, p_tokens);
  IF reservation_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.ai_usage_logs
  SET status = 'success'
  WHERE id = reservation_id
    AND user_id = auth.uid()
    AND operation = 'quota_reserve'
    AND status = 'reserved';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$consume$;

REVOKE ALL ON FUNCTION public.reserve_ai_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_ai_quota(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_ai_quota_reservation(uuid, text, integer, integer, numeric, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_ai_quota_reservation(uuid, text, integer, integer, numeric, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_consume_ai_quota(uuid, integer) FROM anon;

GRANT EXECUTE ON FUNCTION public.reserve_ai_quota(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_quota_reservation(uuid, text, integer, integer, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_consume_ai_quota(uuid, integer) TO authenticated;

COMMIT;
