DROP POLICY IF EXISTS "Admins manage benchmarks" ON public.benchmark_prices;
CREATE POLICY "Admins and advisors manage benchmarks"
ON public.benchmark_prices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role));

DROP POLICY IF EXISTS "Admins manage prices" ON public.eod_prices;
CREATE POLICY "Admins and advisors manage prices"
ON public.eod_prices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role));

DROP POLICY IF EXISTS "Admins manage kbai" ON public.kbai_index;
CREATE POLICY "Admins and advisors manage kbai"
ON public.kbai_index
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role));

DROP POLICY IF EXISTS "Admins manage snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins and advisors manage snapshots"
ON public.portfolio_snapshots
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role));

DROP POLICY IF EXISTS "Users view own holdings" ON public.holdings;
CREATE POLICY "Users view own holdings"
ON public.holdings
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advisor'::public.app_role)
);

DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advisor'::public.app_role)
);

DROP POLICY IF EXISTS "Users view own cash" ON public.cash_balances;
CREATE POLICY "Users view own cash"
ON public.cash_balances
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advisor'::public.app_role)
);

DROP POLICY IF EXISTS "Users view own cash movements" ON public.cash_movements;
CREATE POLICY "Users view own cash movements"
ON public.cash_movements
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advisor'::public.app_role)
);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'advisor'::public.app_role)
);