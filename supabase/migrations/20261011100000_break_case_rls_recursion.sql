-- Break the assistance_cases <-> case_assignments RLS recursion.
-- These helpers derive the actor exclusively from the verified JWT; callers cannot
-- provide an arbitrary user/advisor ID. SECURITY DEFINER is safe here because the
-- functions are narrowly scoped, use a fixed search_path, and return booleans only.
CREATE OR REPLACE FUNCTION public.is_case_assigned_advisor(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.case_assignments AS ca
       WHERE ca.case_id = p_case_id
         AND ca.advisor_id = auth.uid()
     );
$function$;

CREATE OR REPLACE FUNCTION public.is_case_owner(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.assistance_cases AS c
       WHERE c.id = p_case_id
         AND c.user_id = auth.uid()
     );
$function$;

REVOKE ALL ON FUNCTION public.is_case_assigned_advisor(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_case_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_case_assigned_advisor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_case_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS cases_self_select ON public.assistance_cases;
CREATE POLICY cases_self_select ON public.assistance_cases
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_case_assigned_advisor(id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS case_assignments_assigned_select ON public.case_assignments;
CREATE POLICY case_assignments_assigned_select ON public.case_assignments
  FOR SELECT TO authenticated
  USING (
    advisor_id = (select auth.uid())
    OR public.is_case_owner(case_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS case_analysis_assigned_select ON public.case_analysis;
CREATE POLICY case_analysis_assigned_select ON public.case_analysis
  FOR SELECT TO authenticated
  USING (
    author_id = (select auth.uid())
    OR public.is_case_assigned_advisor(case_id)
    OR public.is_case_owner(case_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS case_notes_assigned_select ON public.case_notes;
CREATE POLICY case_notes_assigned_select ON public.case_notes
  FOR SELECT TO authenticated
  USING (
    author_id = (select auth.uid())
    OR public.is_case_assigned_advisor(case_id)
    OR public.is_case_owner(case_id)
    OR public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
