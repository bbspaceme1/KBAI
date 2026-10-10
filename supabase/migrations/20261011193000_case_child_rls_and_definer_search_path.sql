-- Close the no-policy RLS findings for case child tables.
-- Access follows the parent assistance_cases visibility policy, while writes are attributable to the caller.
BEGIN;

CREATE POLICY case_analysis_visible_to_case_participants
  ON public.case_analysis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
    )
  );

CREATE POLICY case_analysis_insert_by_author_on_visible_case
  ON public.case_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
    )
  );

CREATE POLICY case_analysis_update_by_author
  ON public.case_analysis
  FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
    )
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
    )
  );

CREATE POLICY case_analysis_delete_by_author
  ON public.case_analysis
  FOR DELETE
  TO authenticated
  USING (author_id = (SELECT auth.uid()));

CREATE POLICY case_notes_visible_to_case_participants
  ON public.case_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
    )
  );

CREATE POLICY case_notes_insert_by_author_on_visible_case
  ON public.case_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
    )
  );

CREATE POLICY case_notes_update_by_author
  ON public.case_notes
  FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
    )
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
    )
  );

CREATE POLICY case_notes_delete_by_author
  ON public.case_notes
  FOR DELETE
  TO authenticated
  USING (author_id = (SELECT auth.uid()));

-- Keep SECURITY DEFINER execution on an empty search_path to prevent object shadowing.
-- Bodies use schema-qualified relations/functions; this does not revoke legitimate RPC access.
ALTER FUNCTION public.adjust_cash_balance(uuid, numeric) SET search_path = '';
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = '';
ALTER FUNCTION public.try_consume_ai_quota(uuid, integer) SET search_path = '';
ALTER FUNCTION public.upsert_holding_buy(uuid, text, integer, numeric) SET search_path = '';

COMMIT;
