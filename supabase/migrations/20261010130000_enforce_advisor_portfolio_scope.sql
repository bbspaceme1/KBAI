-- Forward-only authorization correction: advisors may read only explicitly assigned
-- clients' holdings and snapshots. Snapshot writes remain administrator/service-role only.
BEGIN;

DROP POLICY IF EXISTS "Users view own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users and scoped staff view holdings" ON public.holdings;
CREATE POLICY "Users and scoped staff view holdings"
  ON public.holdings
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((SELECT auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.advisor_clients ac
        WHERE ac.advisor_id = (SELECT auth.uid())
          AND ac.client_id = holdings.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Users and admins view snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Users and scoped staff view snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users and scoped staff view snapshots"
  ON public.portfolio_snapshots
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR (
      public.has_role((SELECT auth.uid()), 'advisor'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.advisor_clients ac
        WHERE ac.advisor_id = (SELECT auth.uid())
          AND ac.client_id = portfolio_snapshots.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins delete snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins delete snapshots"
  ON public.portfolio_snapshots
  FOR DELETE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins insert snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins insert snapshots"
  ON public.portfolio_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Admins update snapshots"
  ON public.portfolio_snapshots
  FOR UPDATE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));


-- Do not expose other users' role assignments through direct RPC calls.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $rolecheck$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NOT NULL AND _user_id IS DISTINCT FROM caller_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_sub_roles r
      WHERE r.user_id = caller_id AND r.role = 'admin'::public.app_role
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_sub_roles r
    WHERE r.user_id = _user_id AND r.role = _role
  );
END;
$rolecheck$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

COMMIT;
