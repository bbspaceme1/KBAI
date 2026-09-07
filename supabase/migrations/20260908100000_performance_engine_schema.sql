-- P27: versioned portfolio performance data. Apply through staging before production.
CREATE TABLE IF NOT EXISTS public.portfolio_cash_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_date date NOT NULL,
  amount numeric(20,4) NOT NULL,
  flow_type text NOT NULL CHECK (flow_type IN ('deposit','withdrawal')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_cash_flows_user_date_idx ON public.portfolio_cash_flows(user_id, flow_date);
ALTER TABLE public.portfolio_cash_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portfolio_cash_flows_owner_select ON public.portfolio_cash_flows;
CREATE POLICY portfolio_cash_flows_owner_select ON public.portfolio_cash_flows FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

INSERT INTO public.portfolio_cash_flows (user_id, flow_date, amount, flow_type)
SELECT user_id, (created_at AT TIME ZONE 'UTC')::date,
  CASE WHEN movement_type = 'DEPOSIT' THEN amount ELSE -amount END,
  CASE WHEN movement_type = 'DEPOSIT' THEN 'deposit' ELSE 'withdrawal' END
FROM public.cash_movements
WHERE movement_type IN ('DEPOSIT','WITHDRAW')
  AND NOT EXISTS (
    SELECT 1 FROM public.portfolio_cash_flows p
    WHERE p.user_id = cash_movements.user_id
      AND p.flow_date = (cash_movements.created_at AT TIME ZONE 'UTC')::date
      AND p.amount = CASE WHEN cash_movements.movement_type = 'DEPOSIT' THEN cash_movements.amount ELSE -cash_movements.amount END
  );

CREATE OR REPLACE FUNCTION public.sync_portfolio_cash_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'DEPOSIT' THEN
    INSERT INTO public.portfolio_cash_flows(user_id, flow_date, amount, flow_type)
    VALUES (NEW.user_id, (NEW.created_at AT TIME ZONE 'UTC')::date, NEW.amount, 'deposit');
  ELSIF NEW.movement_type = 'WITHDRAW' THEN
    INSERT INTO public.portfolio_cash_flows(user_id, flow_date, amount, flow_type)
    VALUES (NEW.user_id, (NEW.created_at AT TIME ZONE 'UTC')::date, -NEW.amount, 'withdrawal');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS cash_movements_performance_flow ON public.cash_movements;
CREATE TRIGGER cash_movements_performance_flow AFTER INSERT ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION public.sync_portfolio_cash_flow();

CREATE TABLE IF NOT EXISTS public.performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL, twr_cumulative numeric(20,8) NOT NULL, xirr_annualized numeric(20,8),
  max_drawdown numeric(20,8) NOT NULL DEFAULT 0, current_drawdown numeric(20,8) NOT NULL DEFAULT 0,
  methodology_version_id uuid REFERENCES public.methodology_versions(id), computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS performance_snapshots_user_date_idx ON public.performance_snapshots(user_id, snapshot_date DESC);
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS performance_snapshots_owner_select ON public.performance_snapshots;
CREATE POLICY performance_snapshots_owner_select ON public.performance_snapshots FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.benchmark_base100_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), benchmark_symbol public.benchmark_symbol NOT NULL,
  period_start_date date NOT NULL, base_value numeric(20,8) NOT NULL, as_of_date date NOT NULL,
  normalized_value numeric(20,8) NOT NULL, raw_value numeric(20,8) NOT NULL,
  UNIQUE(benchmark_symbol, period_start_date, as_of_date)
);
CREATE INDEX IF NOT EXISTS benchmark_base100_lookup_idx ON public.benchmark_base100_series(benchmark_symbol, period_start_date, as_of_date);
ALTER TABLE public.benchmark_base100_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS benchmark_base100_authenticated_select ON public.benchmark_base100_series;
CREATE POLICY benchmark_base100_authenticated_select ON public.benchmark_base100_series FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.benchmark_base100_series TO authenticated;
