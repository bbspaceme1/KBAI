-- P29: one annual membership plan. Pricing is product-approved at IDR 25,000,000/year.
-- The existing public.subscriptions table is reserved for AI quota; company_subscriptions avoids breaking it.
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_code text UNIQUE NOT NULL, display_name text NOT NULL,
  price_annual numeric(20,2) NOT NULL CHECK (price_annual >= 0), currency text NOT NULL DEFAULT 'IDR',
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.plans(plan_code, display_name, price_annual) VALUES ('kbai_annual', 'KBAI Annual', 25000000) ON CONFLICT (plan_code) DO UPDATE SET price_annual = EXCLUDED.price_annual, is_active = true;
CREATE TABLE IF NOT EXISTS public.features (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feature_code text UNIQUE NOT NULL, description text NOT NULL);
INSERT INTO public.features(feature_code, description) VALUES
 ('community_intelligence','Community intelligence access'),('ai_research_quota','AI research access'),('advisor_assistance','Advisor assistance'),('idx_screener_access','IDX screener access'),('annual_user_capacity','Annual membership capacity')
ON CONFLICT (feature_code) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE, limit_value numeric(20,2), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(plan_id, feature_id)
);
INSERT INTO public.plan_entitlements(plan_id, feature_id, limit_value)
SELECT p.id, f.id, CASE WHEN f.feature_code = 'annual_user_capacity' THEN 100 ELSE NULL END FROM public.plans p CROSS JOIN public.features f WHERE p.plan_code = 'kbai_annual' ON CONFLICT (plan_id, feature_id) DO UPDATE SET limit_value = EXCLUDED.limit_value;
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL CHECK (status IN ('pending','paid','active','failed','expired','cancelled','refunded')), started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_subscriptions_user_idx ON public.company_subscriptions(user_id, status);
CREATE OR REPLACE FUNCTION public.enforce_annual_membership_capacity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE active_count integer;
BEGIN
  IF NEW.status IN ('pending','paid','active') THEN
    SELECT count(*) INTO active_count FROM public.company_subscriptions WHERE extract(year FROM started_at) = extract(year FROM NEW.started_at) AND status IN ('pending','paid','active') AND id <> NEW.id;
    IF active_count >= 100 THEN RAISE EXCEPTION 'annual KBAI membership capacity reached'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS company_subscription_capacity_trigger ON public.company_subscriptions;
CREATE TRIGGER company_subscription_capacity_trigger BEFORE INSERT OR UPDATE OF status, started_at ON public.company_subscriptions FOR EACH ROW EXECUTE FUNCTION public.enforce_annual_membership_capacity();
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id uuid NOT NULL REFERENCES public.company_subscriptions(id) ON DELETE CASCADE,
  amount numeric(20,2) NOT NULL CHECK(amount >= 0), currency text NOT NULL DEFAULT 'IDR', status text NOT NULL CHECK (status IN ('pending','paid','active','failed','expired','cancelled','refunded')),
  payment_method text, external_reference text UNIQUE, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.revenue_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid UNIQUE REFERENCES public.payments(id) ON DELETE SET NULL, amount numeric(20,2) NOT NULL, currency text NOT NULL, recognized_date date NOT NULL DEFAULT current_date, revenue_type text NOT NULL DEFAULT 'subscription', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.record_subscription_revenue() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO public.revenue_records(payment_id, amount, currency) VALUES (NEW.id, NEW.amount, NEW.currency) ON CONFLICT (payment_id) DO NOTHING;
  END IF; RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS payments_revenue_trigger ON public.payments;
CREATE TRIGGER payments_revenue_trigger AFTER INSERT OR UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.record_subscription_revenue();
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_subscriptions_owner_select ON public.company_subscriptions;
CREATE POLICY company_subscriptions_owner_select ON public.company_subscriptions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id OR public.has_role((select auth.uid()), 'admin'::public.app_role));
DROP POLICY IF EXISTS payments_owner_select ON public.payments;
CREATE POLICY payments_owner_select ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.company_subscriptions s WHERE s.id = payments.subscription_id AND (s.user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'::public.app_role))));
DROP POLICY IF EXISTS revenue_admin_select ON public.revenue_records;
CREATE POLICY revenue_admin_select ON public.revenue_records FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
