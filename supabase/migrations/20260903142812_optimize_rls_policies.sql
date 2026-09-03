-- Optimize RLS policy evaluation without changing effective permissions.
-- auth_rls_initplan: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
-- multiple_permissive_policies: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- Profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((select auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.advisor_clients
        WHERE advisor_id = (select auth.uid())
          AND client_id = public.profiles.id
      )
    )
  );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- User roles: SELECT is the union of the former user and admin policies.
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users and admins view roles" ON public.user_roles FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Transactions
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((select auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.advisor_clients
        WHERE advisor_id = (select auth.uid())
          AND client_id = public.transactions.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
CREATE POLICY "Users insert own transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own transactions" ON public.transactions;
CREATE POLICY "Users delete own transactions" ON public.transactions FOR DELETE TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

-- Publicly readable market/index data keeps the original USING (true) permission.
DROP POLICY IF EXISTS "Authenticated read benchmarks" ON public.benchmark_prices;
DROP POLICY IF EXISTS "Admins and advisors manage benchmarks" ON public.benchmark_prices;
CREATE POLICY "Authenticated read benchmarks" ON public.benchmark_prices FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins insert benchmarks" ON public.benchmark_prices FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins update benchmarks" ON public.benchmark_prices FOR UPDATE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins delete benchmarks" ON public.benchmark_prices FOR DELETE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated read prices" ON public.eod_prices;
DROP POLICY IF EXISTS "Admins and advisors manage prices" ON public.eod_prices;
CREATE POLICY "Authenticated read prices" ON public.eod_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert prices" ON public.eod_prices FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins update prices" ON public.eod_prices FOR UPDATE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins delete prices" ON public.eod_prices FOR DELETE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );

DROP POLICY IF EXISTS "Authenticated read kbai" ON public.kbai_index;
DROP POLICY IF EXISTS "Admins and advisors manage kbai" ON public.kbai_index;
CREATE POLICY "Authenticated read kbai" ON public.kbai_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert kbai" ON public.kbai_index FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins update kbai" ON public.kbai_index FOR UPDATE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins delete kbai" ON public.kbai_index FOR DELETE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );

DROP POLICY IF EXISTS "Users view own snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Admins and advisors manage snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users and admins view snapshots" ON public.portfolio_snapshots FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins insert snapshots" ON public.portfolio_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins update snapshots" ON public.portfolio_snapshots FOR UPDATE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins delete snapshots" ON public.portfolio_snapshots FOR DELETE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );

-- Cash balances and movements
DROP POLICY IF EXISTS "Users view own cash" ON public.cash_balances;
DROP POLICY IF EXISTS "Admins manage cash" ON public.cash_balances;
CREATE POLICY "Users and admins view cash" ON public.cash_balances FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins insert cash" ON public.cash_balances FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins update cash" ON public.cash_balances FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins delete cash" ON public.cash_balances FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users view own cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Users insert own cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Admins manage cash movements" ON public.cash_movements;
CREATE POLICY "Users and admins view cash movements" ON public.cash_movements FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Users and admins insert cash movements" ON public.cash_movements FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
CREATE POLICY "Admins update cash movements" ON public.cash_movements FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins delete cash movements" ON public.cash_movements FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Broadcasts and audit logs
DROP POLICY IF EXISTS "Authenticated read broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Advisors and admins manage broadcasts" ON public.broadcasts;
CREATE POLICY "Authenticated read broadcasts" ON public.broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert broadcasts" ON public.broadcasts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins update broadcasts" ON public.broadcasts FOR UPDATE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  )
  WITH CHECK (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );
CREATE POLICY "Admins delete broadcasts" ON public.broadcasts FOR DELETE TO authenticated
  USING (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    OR public.has_role((select auth.uid()), 'advisor'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins view all audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);

-- User sessions: merge SELECT, INSERT, and UPDATE while preserving admin ALL access.
DROP POLICY IF EXISTS "Admins manage all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON public.user_sessions;
CREATE POLICY "Users and admins view sessions" ON public.user_sessions FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
CREATE POLICY "Users and admins insert sessions" ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
CREATE POLICY "Users and admins update sessions" ON public.user_sessions FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
CREATE POLICY "Admins delete sessions" ON public.user_sessions FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- System settings
DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated read system settings" ON public.system_settings;
CREATE POLICY "Authenticated read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert system settings" ON public.system_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins update system settings" ON public.system_settings FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins delete system settings" ON public.system_settings FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- Watchlist
DROP POLICY IF EXISTS "Users view own watchlist" ON public.watchlist;
CREATE POLICY "Users view own watchlist" ON public.watchlist FOR SELECT TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "Users insert own watchlist" ON public.watchlist;
CREATE POLICY "Users insert own watchlist" ON public.watchlist FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users update own watchlist" ON public.watchlist;
CREATE POLICY "Users update own watchlist" ON public.watchlist FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users delete own watchlist" ON public.watchlist;
CREATE POLICY "Users delete own watchlist" ON public.watchlist FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);