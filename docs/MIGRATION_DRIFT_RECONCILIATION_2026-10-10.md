# Migration Drift Reconciliation — 2026-10-10

## Scope and safety

Audited repository migration filenames, Supabase migration history, and selected live schema objects for project `ejiufnrqvkvqzxroustb`. No production DDL was executed and no migration-history row was repaired. The 22 timestamp differences are not safe to resolve with blanket `migration repair`: several local migrations correspond to schema objects that are demonstrably absent from the current database.

## Observed migration-history differences

### Local-only versions (12)

| Version | SQL file | Live-schema evidence / safe disposition |
|---|---|---|
| `20260905130001` | `harden_phase0_rls_and_compliance.sql` | **Not applied as written:** live policy inventory returned no policies for `case_analysis`, `case_notes`, `deletion_verification_codes`, `idx_etl_logs`, `methodologies`, or `methodology_versions`. Security-critical; stage and test before applying. |
| `20260905130100` | `fix_advisor_schema_function_mismatches.sql` | **Partially superseded / unresolved:** current financial RPC definitions include later ownership guards and the current `adjust_cash_balance` body; the full migration also defines `soft_delete_user`, which must be verified separately before any repair decision. |
| `20260906120000` | `backfill_test_account_roles.sql` | **Do not apply to production blindly:** it requires seeded test identities `admin@bbspace.test` and `advisor@bbspace.test`, and intentionally raises if either expected role is missing. Run only in an isolated staging environment after creating synthetic fixtures. |
| `20260908100000` | `performance_engine_schema.sql` | **Not applied as written:** live schema inventory did not find `portfolio_cash_flows`, `performance_snapshots`, or `benchmark_base100_series`. Requires staging migration and data-backfill validation. |
| `20260908110000` | `data_pipeline_reconciliation.sql` | **Not applied as written:** live schema inventory did not find `idx_missing_symbols`. Verify the ETL log columns and existing data before applying. |
| `20260908120000` | `company_ops_entitlements_schema.sql` | **Not applied as written:** live schema inventory did not find `plans`, `features`, `plan_entitlements`, `company_subscriptions`, `payments`, or `revenue_records`. Contains seeded plan pricing and revenue-trigger logic; requires business and security review in staging. |
| `20260909100000` | `telegram_login_community_verification.sql` | **Not applied as written:** live schema inventory did not find the `telegram_*` tables. Requires isolated staging tests and verification of bot/webhook integration. |
| `20261003120000` | `reconcile_financial_rpc_ownership.sql` | **Schema appears equivalent for key financial RPCs:** live definitions contain caller ownership checks and the expected `created_at` writes. Because this version is absent from history, compare it against the remote-only RPC corrections before marking it applied. |
| `20261003140000` | `reconcile_advisor_scope_rls.sql` | **Partially equivalent:** live schema has scoped cash/cash-movement policies and the case-owner/assigned-advisor policy. Verify every policy and predicate in the file before considering history repair. |
| `20261005100000` | `canonical_user_sub_roles.sql` | **Schema appears present:** `user_sub_roles` exists, its owner/admin policies exist, and live `has_role` reads from it. Verify grants and row data before marking this version applied. |
| `20261007120000` | `idx_ratio_periods.sql` | **Not applied as written:** live `idx_financial_ratios` has none of `fiscal_year`, `fiscal_quarter`, `reporting_period`, `source`, or `fetched_at`. |
| `20261007130000` | `enforce_idx_ratio_periods.sql` | **Blocked by prerequisite:** period columns are absent. Must first add columns, backfill/quarantine old rows, and validate duplicate issuer-period rows in staging. |

### Remote-only versions (10)

The remote history contains these versions, but the corresponding SQL files are absent from the current repository migration directory:

- `20261002183536` — `reconcile_financial_rpc_ownership`
- `20261002183606` — `reconcile_financial_rpc_ownership`
- `20261002183624` — `reconcile_financial_rpc_ownership`
- `20261002183633` — `reconcile_financial_rpc_ownership_verify`
- `20261002183716` — `reconcile_financial_rpc_acl_verify_v2`
- `20261002183743` — `inspect_financial_rpc_definitions`
- `20261002183752` — `inspect_financial_rpc_definitions_detail`
- `20261002183831` — `reconcile_financial_rpc_ownership_v2`
- `20261002183853` — `verify_financial_rpc_acl_and_search_path`
- `20261003075330` — `reconcile_advisor_scope_rls`

Supabase migration history records versions/names, not the original SQL bodies. The live database shows that some of the RPC and RLS corrections are present, but that is not enough to reconstruct the exact intent of every historical step. Recover the original SQL from reviewed commits, operator logs, or the author before creating archival files. Do not create empty/no-op files to make the drift check green, and do not mark remote-only migrations reverted while their effects remain in the schema.

## Required safe sequence

1. Provision an isolated staging Supabase project/database and synthetic users. Current connection exposes the production project only; no staging project ref is configured in `supabase/config.toml`.
2. Recover the ten remote-only SQL bodies or produce a reviewed reconstruction from live function/policy definitions and an audit trail.
3. Apply the unapplied local migrations to staging in dependency order. Do not run the test-account role backfill against production.
4. Test the security policies, RPC ownership guards, performance snapshots/backfill, company entitlements/revenue trigger, Telegram membership tables, and financial-ratio backfill/uniqueness.
5. Compare staging schema and behavior against production. Create a reviewed forward-only migration plan for production; do not use broad migration repair as a substitute for missing schema changes.
6. Only repair migration history for versions whose effects are proven present and equivalent. Re-run `supabase migration list` and the GitHub drift workflow; keep the gate red until all real differences are resolved.

## Staging gate

The CI workflow must use environment-scoped `STAGING_*` secrets and reject the production Supabase project ref. Missing staging credentials are a deliberate fail-closed blocker; never substitute production secrets merely to turn E2E green.
