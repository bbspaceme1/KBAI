-- P24: enforce caller ownership inside financial SECURITY DEFINER RPCs.
-- The application calls these RPCs through supabaseAdmin after requireSupabaseAuth(),
-- but the database must enforce the same invariant independently of the client.
-- No production application data is changed by this migration.

CREATE OR REPLACE FUNCTION public.upsert_holding_buy(
  p_user_id uuid,
  p_ticker text,
  p_lot integer,
  p_price numeric
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_current_lot integer;
  v_current_cost numeric;
  v_new_avg_price numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_lot <= 0 OR p_price < 0 OR p_ticker IS NULL OR btrim(p_ticker) = '' THEN
    RAISE EXCEPTION 'invalid holding transaction';
  END IF;

  SELECT total_lot, (avg_price * total_lot) INTO v_current_lot, v_current_cost
  FROM public.holdings WHERE user_id = p_user_id AND ticker = p_ticker FOR UPDATE;

  IF v_current_lot IS NULL THEN
    INSERT INTO public.holdings (user_id, ticker, total_lot, avg_price, created_at, updated_at)
    VALUES (p_user_id, p_ticker, p_lot, p_price, now(), now())
    ON CONFLICT (user_id, ticker) DO UPDATE SET
      total_lot = public.holdings.total_lot + EXCLUDED.total_lot,
      avg_price = ((public.holdings.avg_price * public.holdings.total_lot) + (EXCLUDED.total_lot * EXCLUDED.avg_price)) /
        (public.holdings.total_lot + EXCLUDED.total_lot),
      updated_at = now();
  ELSE
    v_new_avg_price := (v_current_cost + (p_lot * p_price)) / (v_current_lot + p_lot);
    UPDATE public.holdings SET total_lot = v_current_lot + p_lot, avg_price = v_new_avg_price, updated_at = now()
    WHERE user_id = p_user_id AND ticker = p_ticker;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_holding_sell(
  p_user_id uuid,
  p_ticker text,
  p_lot integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_current_lot integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_lot <= 0 OR p_ticker IS NULL OR btrim(p_ticker) = '' THEN RAISE EXCEPTION 'invalid holding transaction'; END IF;
  SELECT total_lot INTO v_current_lot FROM public.holdings
  WHERE user_id = p_user_id AND ticker = p_ticker FOR UPDATE;
  IF v_current_lot IS NULL OR v_current_lot < p_lot THEN RAISE EXCEPTION 'insufficient holdings'; END IF;
  IF v_current_lot = p_lot THEN
    DELETE FROM public.holdings WHERE user_id = p_user_id AND ticker = p_ticker;
  ELSE
    UPDATE public.holdings SET total_lot = v_current_lot - p_lot, updated_at = now()
    WHERE user_id = p_user_id AND ticker = p_ticker;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.adjust_cash_balance(p_user_id uuid, p_delta numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_new_balance numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.cash_balances SET balance = balance + p_delta, updated_at = now()
  WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;
  IF v_new_balance IS NULL THEN
    INSERT INTO public.cash_balances (user_id, balance, created_at, updated_at)
    VALUES (p_user_id, p_delta, now()) RETURNING balance INTO v_new_balance;
  END IF;
  IF v_new_balance < 0 THEN RAISE EXCEPTION 'insufficient cash balance'; END IF;
  RETURN v_new_balance;
END $$;

REVOKE EXECUTE ON FUNCTION public.upsert_holding_buy(uuid, text, integer, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_holding_sell(uuid, text, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_cash_balance(uuid, numeric) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_holding_buy(uuid, text, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_holding_sell(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_cash_balance(uuid, numeric) TO authenticated;

COMMENT ON FUNCTION public.upsert_holding_buy IS 'Caller-owned atomic BUY; auth.uid() must equal p_user_id.';
COMMENT ON FUNCTION public.upsert_holding_sell IS 'Caller-owned atomic SELL; auth.uid() must equal p_user_id.';
COMMENT ON FUNCTION public.adjust_cash_balance IS 'Caller-owned atomic cash adjustment; auth.uid() must equal p_user_id.';
