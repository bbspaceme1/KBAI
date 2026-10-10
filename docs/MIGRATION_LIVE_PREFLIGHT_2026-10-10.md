# Live Migration Preflight — 2026-10-10

**Decision: STOP before production writes.** This file records read-only evidence from the connected Supabase project `ejiufnrqvkvqzxroustb` and the PR #26 migration tree. It does not authorize ledger repair or production migration.

## Exact observations

- Supabase project reports healthy/active, but its listed database branch status is `MIGRATIONS_FAILED`.
- The live migration ledger query returned 53 versions, latest `20261010150752` (`harden_security_advisor_access_boundaries`). The candidate tree's last recorded inventory has 68 SQL files, 53 shared and 15 local-only. Re-run the exact-head drift workflow before relying on these counts as a current parity assertion.
- `public.ai_usage_logs_status_check` currently allows only `success` and `error`.
- The live `public.idx_financial_ratios` schema has only its older columns (`id`, `ticker`, `date`, and existing financial metrics); it has no `fiscal_year`, `fiscal_quarter`, `reporting_period`, `source`, or `fetched_at` columns. The period-enforcement migration must not be run before a verified, deterministic treatment of existing rows.
- The following PRD objects were not found in the live public table inventory: `portfolio_cash_flows`, `performance_snapshots`, `benchmark_base100_series`, `plans`, `features`, `plan_entitlements`, `company_subscriptions`, `payments`, `revenue_records`, `telegram_chats`, `telegram_memberships`, and `idx_missing_symbols`.
- Six live tables have RLS enabled with no policies: `case_analysis`, `case_notes`, `deletion_verification_codes`, `idx_etl_logs`, `methodologies`, and `methodology_versions`. Default-deny is not the same as data exposure; intended owner/admin access must be specified before adding policies.
- Five live SECURITY DEFINER functions are executable by `authenticated`: `adjust_cash_balance`, `has_role`, `try_consume_ai_quota`, `upsert_holding_buy`, and `upsert_holding_sell`. Function bodies differ in ownership guards, so grants must be fixed individually, not with a blanket revoke.
- The live quota function `try_consume_ai_quota(p_user, p_tokens)` does not check `auth.uid() = p_user` and accepts non-positive tokens; the new candidate RPC is not yet present remotely.
- The live quota schema's foreign key for `ai_usage_logs.user_id` references `profiles(id)`, not `auth.users(id)`; candidate code and migrations must keep identity types and FK semantics consistent.

## Release-safe sequence

1. Preserve production data and migration ledger. Do not use `supabase migration repair`, `supabase db push`, reset, or direct DDL while any local-only version remains unresolved.
2. Provision no paid resource. An isolated staging project/branch and a restorable backup must be confirmed to be available at no additional charge before production DDL.
3. For each of the 15 local-only versions, record APPLY / SKIP with schema-equivalence evidence / UNRESOLVED after inspecting the original SQL, dependencies, live catalog and affected rows.
4. Correct the fiscal-period migration sequence only after the business meaning of `date` and the intended IDX fiscal period is established. Do not infer fiscal year/quarter from a snapshot date without evidence.
5. Apply reviewed migrations in isolated staging; replay from empty DB, run quota concurrency and spoofed-user tests, owner/admin/advisor RLS matrix, and app smoke tests.
6. Confirm a backup can be restored. Only then schedule production application of the reviewed migrations in order, followed by read-only schema/function/policy checks.
7. Re-run CI and migration drift on the exact final commit. Production stays HOLD if any required check or restore test is unavailable.

## Cost and safety

No production SQL writes, data transformations, migration-ledger edits, paid staging resources, deployment promotion, or DNS changes were performed for this preflight. This is intentional: the currently connected environment does not establish a verified staging target or a restorable no-cost production backup.
