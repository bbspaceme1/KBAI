-- 1. Broadcasts table for advisor → members market insight
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  posted_by UUID NOT NULL,
  posted_by_username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read broadcasts"
ON public.broadcasts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Advisors and admins manage broadcasts"
ON public.broadcasts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'));

CREATE TRIGGER update_broadcasts_updated_at
BEFORE UPDATE ON public.broadcasts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Wipe all portfolio data for current admin users
WITH admin_ids AS (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
)
DELETE FROM public.cash_movements WHERE user_id IN (SELECT user_id FROM admin_ids);

WITH admin_ids AS (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
)
DELETE FROM public.transactions WHERE user_id IN (SELECT user_id FROM admin_ids);

WITH admin_ids AS (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
)
DELETE FROM public.holdings WHERE user_id IN (SELECT user_id FROM admin_ids);

WITH admin_ids AS (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
)
DELETE FROM public.portfolio_snapshots WHERE user_id IN (SELECT user_id FROM admin_ids);

WITH admin_ids AS (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
)
UPDATE public.cash_balances SET balance = 0 WHERE user_id IN (SELECT user_id FROM admin_ids);