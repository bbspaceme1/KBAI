-- Align security-definer functions with the current production schema.

CREATE OR REPLACE FUNCTION public.adjust_cash_balance(
  p_user_id uuid,
  p_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE public.cash_balances
  SET balance = balance + p_delta,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    INSERT INTO public.cash_balances (user_id, balance, updated_at)
    VALUES (p_user_id, p_delta, now())
    RETURNING balance INTO v_new_balance;
  END IF;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_holding_buy(
  p_user_id uuid,
  p_ticker text,
  p_lot integer,
  p_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_lot integer;
  v_current_cost numeric;
  v_new_avg_price numeric;
BEGIN
  SELECT total_lot, (avg_price * total_lot)
    INTO v_current_lot, v_current_cost
  FROM public.holdings
  WHERE user_id = p_user_id AND ticker = p_ticker
  FOR UPDATE;

  IF v_current_lot IS NULL THEN
    INSERT INTO public.holdings (user_id, ticker, total_lot, avg_price, updated_at)
    VALUES (p_user_id, p_ticker, p_lot, p_price, now())
    ON CONFLICT (user_id, ticker) DO NOTHING;
  ELSE
    v_new_avg_price := (v_current_cost + (p_lot * p_price)) / (v_current_lot + p_lot);

    UPDATE public.holdings
    SET total_lot = v_current_lot + p_lot,
        avg_price = v_new_avg_price,
        updated_at = now()
    WHERE user_id = p_user_id AND ticker = p_ticker;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{deleted}',
    'true'::jsonb
  )
  WHERE id = auth.uid();
END;
$$;
