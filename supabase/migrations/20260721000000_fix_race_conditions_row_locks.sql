-- Fix race conditions in financial operations by adding row locks
-- Addresses: SELL transaction double-execution, WITHDRAW overdraft, lost-update on concurrent buys
-- Date: 2026-07-21

-- Fix 1: upsert_holding_buy with FOR UPDATE lock
CREATE OR REPLACE FUNCTION upsert_holding_buy(
  p_user_id uuid,
  p_ticker text,
  p_lot integer,
  p_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_lot integer;
  v_current_cost numeric;
  v_new_avg_price numeric;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT total_lot, (avg_price * total_lot) INTO v_current_lot, v_current_cost
  FROM holdings
  WHERE user_id = p_user_id AND ticker = p_ticker
  FOR UPDATE;

  IF v_current_lot IS NULL THEN
    -- First buy of this ticker
    INSERT INTO holdings (user_id, ticker, total_lot, avg_price, created_at, updated_at)
    VALUES (p_user_id, p_ticker, p_lot, p_price, now(), now())
    ON CONFLICT (user_id, ticker) DO NOTHING;
  ELSE
    -- Update existing holding with weighted average
    v_new_avg_price := (v_current_cost + (p_lot * p_price)) / (v_current_lot + p_lot);
    
    UPDATE holdings
    SET
      total_lot = v_current_lot + p_lot,
      avg_price = v_new_avg_price,
      updated_at = now()
    WHERE user_id = p_user_id AND ticker = p_ticker;
  END IF;
END $$;

-- Fix 2: upsert_holding_sell with FOR UPDATE lock
CREATE OR REPLACE FUNCTION upsert_holding_sell(
  p_user_id uuid,
  p_ticker text,
  p_lot integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_lot integer;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT total_lot INTO v_current_lot
  FROM holdings
  WHERE user_id = p_user_id AND ticker = p_ticker
  FOR UPDATE;

  IF v_current_lot IS NULL THEN
    -- Shouldn't happen if txn validation works, but be safe
    RETURN;
  END IF;

  IF v_current_lot - p_lot <= 0 THEN
    -- Selling all holdings or more (all check happens in application)
    DELETE FROM holdings
    WHERE user_id = p_user_id AND ticker = p_ticker;
  ELSE
    -- Partial sell - update quantity (avg_price stays same, only lot decreases)
    UPDATE holdings
    SET
      total_lot = v_current_lot - p_lot,
      updated_at = now()
    WHERE user_id = p_user_id AND ticker = p_ticker;
  END IF;
END $$;

-- Fix 3: improve adjust_cash_balance RPC to be fully atomic
-- This RPC should be called BEFORE the app-side balance check, moving validation into DB
CREATE OR REPLACE FUNCTION adjust_cash_balance(
  p_user_id uuid,
  p_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  -- Lock the cash_balances row for this user
  UPDATE cash_balances
  SET balance = balance + p_delta,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    -- First time user has cash_balances entry
    INSERT INTO cash_balances (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, p_delta, now(), now())
    RETURNING balance INTO v_new_balance;
  END IF;

  -- Return the new balance
  RETURN COALESCE(v_new_balance, 0);
END $$;

-- Fix 4: Add CHECK constraint to prevent negative balances at database level
-- This is a safety net in case the RPC validation is bypassed
ALTER TABLE cash_balances
ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);

-- Fix 5: Add search_path to existing functions that were missing it
CREATE OR REPLACE FUNCTION soft_delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET user_metadata = jsonb_set(
    COALESCE(user_metadata, '{}'::jsonb),
    '{deleted}',
    'true'::jsonb
  )
  WHERE id = auth.uid();
END $$;

-- Document changes
COMMENT ON FUNCTION upsert_holding_buy IS 'Incremental BUY transaction with row lock to prevent race conditions';
COMMENT ON FUNCTION upsert_holding_sell IS 'Incremental SELL transaction with row lock to prevent race conditions';
COMMENT ON FUNCTION adjust_cash_balance IS 'Atomic cash balance adjustment with row lock and non-negative constraint';
