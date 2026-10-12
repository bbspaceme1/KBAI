
-- Restrict sensitive verification codes to trusted server-side service access.
-- service_role bypasses RLS; no anon/authenticated policies are created.
CREATE POLICY "deletion_verification_codes_service_only"
ON public.deletion_verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ETL operational logs are not client-facing data.
CREATE POLICY "idx_etl_logs_service_only"
ON public.idx_etl_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Published methodology content may be read; drafts remain unavailable to clients.
CREATE POLICY "methodology_versions_read_published"
ON public.methodology_versions
FOR SELECT
TO anon, authenticated
USING (published_at IS NOT NULL);

CREATE POLICY "methodologies_read_if_has_published_version"
ON public.methodologies
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.methodology_versions mv
    WHERE mv.methodology_id = methodologies.id
      AND mv.published_at IS NOT NULL
  )
);
