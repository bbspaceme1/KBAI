-- Forward-only correction: case child rows must follow parent-case ownership
-- or explicit advisor assignment. A mere parent-row existence check leaks all
-- case analysis/notes to every authenticated user because permissive policies OR together.
BEGIN;

DROP POLICY IF EXISTS case_analysis_visible_to_case_participants ON public.case_analysis;
DROP POLICY IF EXISTS case_notes_visible_to_case_participants ON public.case_notes;
DROP POLICY IF EXISTS case_analysis_assigned_select ON public.case_analysis;
DROP POLICY IF EXISTS case_notes_assigned_select ON public.case_notes;

CREATE POLICY case_analysis_visible_to_case_participants
  ON public.case_analysis
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_analysis_insert_by_author_on_visible_case
  ON public.case_analysis
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_analysis_update_by_author_on_visible_case
  ON public.case_analysis
  FOR UPDATE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_analysis_delete_by_author_on_visible_case
  ON public.case_analysis
  FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_analysis.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_notes_visible_to_case_participants
  ON public.case_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_notes_insert_by_author_on_visible_case
  ON public.case_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_notes_update_by_author_on_visible_case
  ON public.case_notes
  FOR UPDATE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY case_notes_delete_by_author_on_visible_case
  ON public.case_notes
  FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assistance_cases AS ac
      WHERE ac.id = case_notes.case_id
        AND (
          ac.user_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.case_assignments AS ca
            WHERE ca.case_id = ac.id AND ca.advisor_id = (SELECT auth.uid())
          )
        )
    )
  );

COMMIT;
