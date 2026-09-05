-- P24 defense-in-depth: remove anonymous compliance access and protect previously
-- policy-less tables. Financial RPC ownership is enforced in the preceding migration.

REVOKE SELECT ON TABLE public.data_compliance_status FROM anon;
GRANT SELECT ON TABLE public.data_compliance_status TO authenticated;

ALTER TABLE IF EXISTS public.deletion_verification_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deletion_codes_owner_select ON public.deletion_verification_codes;
DROP POLICY IF EXISTS deletion_codes_owner_insert ON public.deletion_verification_codes;
DROP POLICY IF EXISTS deletion_codes_owner_delete ON public.deletion_verification_codes;
CREATE POLICY deletion_codes_owner_select ON public.deletion_verification_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY deletion_codes_owner_insert ON public.deletion_verification_codes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY deletion_codes_owner_delete ON public.deletion_verification_codes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE IF EXISTS public.idx_etl_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idx_etl_logs_admin_select ON public.idx_etl_logs;
CREATE POLICY idx_etl_logs_admin_select ON public.idx_etl_logs
  FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

ALTER TABLE IF EXISTS public.case_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_analysis_assigned_select ON public.case_analysis;
DROP POLICY IF EXISTS case_notes_assigned_select ON public.case_notes;
CREATE POLICY case_analysis_assigned_select ON public.case_analysis
  FOR SELECT TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.case_assignments a
      WHERE a.case_id = case_analysis.case_id AND a.advisor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assistance_cases c
      WHERE c.id = case_analysis.case_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY case_notes_assigned_select ON public.case_notes
  FOR SELECT TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.case_assignments a
      WHERE a.case_id = case_notes.case_id AND a.advisor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.assistance_cases c
      WHERE c.id = case_notes.case_id AND c.user_id = auth.uid()
    )
  );

ALTER TABLE IF EXISTS public.methodologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.methodology_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS methodologies_admin_all ON public.methodologies;
DROP POLICY IF EXISTS methodology_versions_admin_all ON public.methodology_versions;
CREATE POLICY methodologies_admin_all ON public.methodologies
  FOR ALL TO authenticated USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));
CREATE POLICY methodology_versions_admin_all ON public.methodology_versions
  FOR ALL TO authenticated USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

ALTER VIEW IF EXISTS public.data_compliance_status SET (security_invoker = true);
