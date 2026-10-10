-- P27: versioned portfolio performance data. Apply through staging before production.
CREATE TABLE IF NOT EXISTS public.portfolio_cash_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_date date NOT NULL,
  amount numeric(20,4) NOT NULL,
  flow_type text NOT NULL CHECK (flow_type IN ('deposit','withdrawal')),
  source_cash_movement_id uuid UNIQUE REFERENCES public.cash_movements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_cash_flows_user_date_idx ON public.portfolio_cash_flows(user_id, flow_date);
ALTER TABLE public.portfolio_cash_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portfolio_cash_flows_owner_select ON public.portfolio_cash_flows;
CREATE POLICY portfolio_cash_flows_owner_select ON public.portfolio_cash_flows FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

INSERT INTO public.portfolio_cash_flows
  (user_id, flow_date, amount, flow_type, source_cash_movement_id)
SELECT cm.user_id, COALESCE(cm.occurred_at, (cm.created_at AT TIME ZONE 'UTC')::date),
  CASE WHEN cm.movement_type = 'DEPOSIT' THEN cm.amount ELSE -cm.amount END,
  CASE WHEN cm.movement_type = 'DEPOSIT' THEN 'deposit' ELSE 'withdrawal' END,
  cm.id
FROM public.cash_movements cm
WHERE cm.movement_type IN ('DEPOSIT','WITHDRAW')
ON CONFLICT (source_cash_movement_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_portfolio_cash_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$1
  -- The trigger may write on behalf of the authenticated owner, or a trusted
  -- service-role operation. Do not permit a normal user to write another user's flow.
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM NEW.user_id
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized to sync portfolio cash flow'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.movement_type = 'DEPOSIT' THEN
    INSERT INTO public.portfolio_cash_flows(user_id, flow_date, amount, flow_type, source_cash_movement_id)
    VALUES (NEW.user_id, COALESCE(NEW.occurred_at, (NEW.created_at AT TIME ZONE 'UTC')::date), NEW.amount, 'deposit', NEW.id)
    ON CONFLICT (source_cash_movement_id) DO NOTHING;
  ELSIF NEW.movement_type = 'WITHDRAW' THEN
    INSERT INTO public.portfolio_cash_flows(user_id, flow_date, amount, flow_type, source_cash_movement_id)
    VALUES (NEW.user_id, COALESCE(NEW.occurred_at, (NEW.created_at AT TIME ZONE 'UTC')::date), -NEW.amount, 'withdrawal', NEW.id)
    ON CONFLICT (source_cash_movement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_portfolio_cash_flow() FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.portfolio_cash_flows FROM anon, authenticated;
GRANT SELECT ON public.portfolio_cash_flows TO authenticated;
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
CREATE POLICY benchmark_base100_public_select ON public.benchmark_base100_series FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.benchmark_base100_series TO anon, authenticated;
