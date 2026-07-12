-- Fix AI quota race condition with advisory lock
BEGIN;

CREATE OR REPLACE FUNCTION public.try_consume_ai_quota(p_user uuid, p_tokens integer)
RETURNS boolean AS $$
DECLARE
  daily_limit bigint := 50000;
  monthly_limit bigint := 500000;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'utc');
  month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'utc');
  current_daily bigint := 0;
  current_monthly bigint := 0;
BEGIN
  -- Acquire advisory lock per user to prevent concurrent quota race conditions
  -- hashtext() converts UUID to a consistent integer for locking
  PERFORM pg_advisory_xact_lock(hashtext(p_user::text));

  -- Pull explicit limits if subscription exists
  SELECT COALESCE(s.daily_limit, 50000), COALESCE(s.monthly_limit, 500000)
    INTO daily_limit, monthly_limit
  FROM public.subscriptions s
  WHERE s.user_id = p_user
  LIMIT 1;

  -- Sum current usage for day and month (after acquiring lock)
  -- Only count entries with status != 'quota_reserve' to avoid counting reserves as usage
  SELECT COALESCE(SUM(total_tokens), 0) INTO current_daily
    FROM public.ai_usage_logs
    WHERE user_id = p_user
      AND created_at >= day_start
      AND status IN ('success', 'completed', 'billed');  -- Only count actual usage

  SELECT COALESCE(SUM(total_tokens), 0) INTO current_monthly
    FROM public.ai_usage_logs
    WHERE user_id = p_user
      AND created_at >= month_start
      AND status IN ('success', 'completed', 'billed');  -- Only count actual usage

  -- Check limits
  IF current_daily + p_tokens > daily_limit THEN
    RETURN FALSE;
  END IF;

  IF current_monthly + p_tokens > monthly_limit THEN
    RETURN FALSE;
  END IF;

  -- Reserve usage by inserting a log record
  -- Application will later update or add a proper usage record
  INSERT INTO public.ai_usage_logs(user_id, model, input_tokens, output_tokens, total_tokens, cost_usd, operation, status)
  VALUES (p_user, 'quota_reserve', p_tokens, 0, p_tokens, 0, 'quota_reserve', 'reserved');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
