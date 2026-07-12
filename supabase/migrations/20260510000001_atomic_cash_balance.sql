-- Migration: atomic cash balance adjustment for portfolio operations
-- Prevents TOCTOU race conditions when multiple cash changes happen concurrently.

CREATE OR REPLACE FUNCTION public.adjust_cash_balance(
  p_user_id uuid,
  p_delta    numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  INSERT INTO cash_balances (user_id, balance, updated_at)
  VALUES (p_user_id, p_delta, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance    = cash_balances.balance + EXCLUDED.balance,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_cash_balance(uuid, numeric)
  TO service_role;
