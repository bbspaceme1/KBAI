# Migration Drift Reconciliation — 2026-10-10

**Release decision: HOLD / NOT PRODUCTION READY.** This is a concise snapshot; the authoritative per-version evidence and dispositions are maintained in `KBAI_RECONCILIATION_PROGRESS.md`.

## Latest candidate evidence

- Candidate: feature branch `fix/gitleaks-pr-base-ref-20261010`; draft PR #26.
- Local migration tree: **58 files**. Remote Supabase ledger: **53 versions**. **43 shared, 15 local-only, 10 remote-only, zero duplicate local versions**.
- Fresh local replay, isolated test fixture setup, **13/13 RLS/RBAC tests**, and **2/2 homepage/login browser smoke tests** passed on the verified candidate line.
- The read-only Database Migration Drift Check still fails because version histories differ. It also reports a GitHub Actions `SUPABASE_URL` project-reference mismatch and unavailable/missing `SUPABASE_ACCESS_TOKEN`.
- No production migration, ledger repair, reset, deployment or other production write was executed. No paid staging project or paid vendor feature was activated.

## Local-only versions — deployment candidates, not approved writes

`20260905130001`, `20260905130100`, `20260908100000`, `20260908110000`, `20260908120000`, `20260909100000`, `20261003120000`, `20261003140000`, `20261005100000`, `20261007120000`, `20261007130000`, `20261010120000`, `20261010130000`, `20261010140000`, `20261010150000`.

## Remote-only versions — preserve history; unresolved

`20261002183536`, `20261002183606`, `20261002183624`, `20261002183633`, `20261002183716`, `20261002183743`, `20261002183752`, `20261002183831`, `20261002183853`, `20261003075330`.

These remote-only entries form an iterative financial-RPC/advisor-scope repair and verification sequence. Their original SQL or equivalent release evidence has not yet been recovered sufficiently to classify each version as APPLY or SKIP. **Do not rename versions, delete remote history, fabricate ledger rows, run `db push`, or repair the production ledger to make the list appear green.**

## Recovered test-account migration

The historical `20260906120000_backfill_test_account_roles.sql` is test-account-specific, not a product schema migration. Its SQL is preserved as `supabase/tests/fixtures/backfill_test_account_roles.sql`, and the fixture now writes to canonical `public.user_sub_roles`. Do not run it as a production migration.

## Required next steps

1. Fix the GitHub Actions `SUPABASE_URL` secret to point at the project configured in `supabase/config.toml` and add a valid `SUPABASE_ACCESS_TOKEN`; never bypass the mismatch guard.
2. Recover or document the original SQL/effect of each remote-only migration and classify every version with schema/function/ACL evidence.
3. Review the rollback/forward-repair plan and free-tier backup/restoration options before authorizing any remote write.
4. Keep production on HOLD until migration parity, coverage, dependency review, public deployment reachability, and Sentry/PostHog ingestion gates are evidenced.
