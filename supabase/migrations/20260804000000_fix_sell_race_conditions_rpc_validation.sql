CREATE OR REPLACE FUNCTION upsert_holding_sell(
  p_user_id uuid,
  p_ticker text,
  p_lot integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_lot integer;
BEGIN
  SELECT total_lot INTO v_current_lot
  FROM holdings
  WHERE user_id = p_user_id AND ticker = p_ticker
  FOR UPDATE;

  IF v_current_lot IS NULL OR v_current_lot < p_lot THEN
    RAISE EXCEPTION 'Insufficient lot: have %, requested %', COALESCE(v_current_lot,0), p_lot;
  END IF;

  IF v_current_lot - p_lot <= 0 THEN
    DELETE FROM holdings
    WHERE user_id = p_user_id AND ticker = p_ticker;
  ELSE
    UPDATE holdings
    SET
      total_lot = v_current_lot - p_lot,
      updated_at = now()
    WHERE user_id = p_user_id AND ticker = p_ticker;
  END IF;
END $$;

COMMENT ON FUNCTION upsert_holding_sell IS 'Incremental SELL transaction - validates lot in RPC and updates holding quantity or deletes if zero';
