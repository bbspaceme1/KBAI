-- Cash balance per user (running total) + audit trail of cash movements
CREATE TABLE public.cash_balances (
  user_id UUID PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cash"
  ON public.cash_balances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage cash"
  ON public.cash_balances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Movement type enum
CREATE TYPE public.cash_movement_type AS ENUM ('DEPOSIT', 'WITHDRAW', 'BUY', 'SELL', 'ADJUST');

CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  movement_type public.cash_movement_type NOT NULL,
  amount NUMERIC NOT NULL, -- positive = inflow, negative = outflow
  ref_transaction_id UUID, -- link to transactions row when BUY/SELL
  note TEXT,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cash movements"
  ON public.cash_movements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own cash movements"
  ON public.cash_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage cash movements"
  ON public.cash_movements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cash_movements_user ON public.cash_movements(user_id, occurred_at DESC);

-- Trigger: ensure cash_balances row exists for new users (handle_new_user already creates profile + role)
CREATE OR REPLACE FUNCTION public.handle_new_user_cash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cash_balances (user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_cash
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_cash();

-- Backfill cash_balances for existing users
INSERT INTO public.cash_balances (user_id, balance)
SELECT id, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
