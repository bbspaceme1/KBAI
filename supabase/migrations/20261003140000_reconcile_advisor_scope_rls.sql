-- Forward-only RLS corrections from remote policy inspection.
-- Restrict advisor access to explicitly assigned clients and fix the case ownership predicate.

DROP POLICY IF EXISTS "Users and admins view cash" ON public.cash_balances;
DROP POLICY IF EXISTS "Users and scoped staff view cash" ON public.cash_balances;
CREATE POLICY "Users and scoped staff view cash"
  ON public.cash_balances
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((select auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.advisor_clients ac
        WHERE ac.advisor_id = (select auth.uid())
          AND ac.client_id = cash_balances.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Users and admins view cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Users and scoped staff view cash movements" ON public.cash_movements;
CREATE POLICY "Users and scoped staff view cash movements"
  ON public.cash_movements
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((select auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.advisor_clients ac
        WHERE ac.advisor_id = (select auth.uid())
          AND ac.client_id = cash_movements.user_id
      )
    )
  );

DROP POLICY IF EXISTS cases_self_select ON public.assistance_cases;
CREATE POLICY cases_self_select
  ON public.assistance_cases
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.case_assignments ca
      WHERE ca.case_id = assistance_cases.id
        AND ca.advisor_id = (select auth.uid())
    )
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins can view deletion logs" ON public.account_deletion_logs;
CREATE POLICY "Admins can view deletion logs"
  ON public.account_deletion_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view audit trail" ON public.data_access_audit;
CREATE POLICY "Admins view audit trail"
  ON public.data_access_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can create export requests" ON public.data_export_requests;
CREATE POLICY "Users can create export requests"
  ON public.data_export_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own exports" ON public.data_export_requests;
CREATE POLICY "Users can view own exports"
  ON public.data_export_requests
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can manage policies" ON public.data_retention_policies;
CREATE POLICY "Admins can manage policies"
  ON public.data_retention_policies
  FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view own retention policy" ON public.data_retention_policies;
CREATE POLICY "Users can view own retention policy"
  ON public.data_retention_policies
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Advisor read access must be limited to explicitly assigned clients.
DROP POLICY IF EXISTS "Users view own holdings" ON public.holdings;
CREATE POLICY "Users and scoped staff view holdings"
  ON public.holdings
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((select auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.advisor_clients ac
        WHERE ac.advisor_id = (select auth.uid())
          AND ac.client_id = holdings.user_id
      )
    )
  );

-- Portfolio snapshots are private portfolio data. Advisors may read only assigned
-- clients' snapshots; only admins or trusted service-role jobs may mutate them.
DROP POLICY IF EXISTS "Users and admins view snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users and scoped staff view snapshots"
  ON public.portfolio_snapshots
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((select auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.advisor_clients ac
        WHERE ac.advisor_id = (select auth.uid())
          AND ac.client_id = portfolio_snapshots.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins delete snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins delete snapshots"
  ON public.portfolio_snapshots
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins insert snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins insert snapshots"
  ON public.portfolio_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins update snapshots"
  ON public.portfolio_snapshots
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
