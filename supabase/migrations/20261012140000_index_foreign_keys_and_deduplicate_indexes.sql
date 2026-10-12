-- T10/T14 proposal: index uncovered foreign keys and remove confirmed duplicate indexes.
-- Human approval and staging validation required before production application.
-- Duplicate index definitions were confirmed from pg_indexes on 2026-10-12.

CREATE INDEX IF NOT EXISTS idx_advisor_clients_client_id_fk ON public.advisor_clients (client_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id_fk ON public.ai_usage_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_author_id_fk ON public.case_analysis (author_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_case_id_fk ON public.case_analysis (case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_author_id_fk ON public.case_notes (author_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id_fk ON public.case_notes (case_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_user_id_fk ON public.data_retention_policies (user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_created_by_fk ON public.feature_flags (created_by);
CREATE INDEX IF NOT EXISTS idx_feature_flags_audit_log_changed_by_fk ON public.feature_flags_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_guidance_author_id_fk ON public.guidance (author_id);
CREATE INDEX IF NOT EXISTS idx_guidance_case_id_fk ON public.guidance (case_id);
CREATE INDEX IF NOT EXISTS idx_guidance_acknowledgements_user_id_fk ON public.guidance_acknowledgements (user_id);
CREATE INDEX IF NOT EXISTS idx_idx_index_constituents_ticker_fk ON public.idx_index_constituents (ticker);
CREATE INDEX IF NOT EXISTS idx_methodologies_active_version_id_fk ON public.methodologies (active_version_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_fk ON public.subscriptions (user_id);

-- Preserve one identical index for each confirmed duplicate pair.
DROP INDEX IF EXISTS public.idx_audit_logs_created;
DROP INDEX IF EXISTS public.idx_eod_ticker_date;
DROP INDEX IF EXISTS public.idx_holdings_user;
DROP INDEX IF EXISTS public.idx_kbai_date;
DROP INDEX IF EXISTS public.idx_notifications_user;
DROP INDEX IF EXISTS public.idx_snapshots_user_date;
DROP INDEX IF EXISTS public.idx_transactions_user;
