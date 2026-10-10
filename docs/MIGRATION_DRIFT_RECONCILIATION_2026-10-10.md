# Migration Drift Reconciliation — 2026-10-10

**Release decision: HOLD / NOT PRODUCTION READY.** This report is a read-only snapshot. The authoritative per-version evidence and dispositions remain in `KBAI_RECONCILIATION_PROGRESS.md`. Re-run the drift workflow before any release decision because remote state can change.

## Latest verified candidate evidence

- Candidate branch: `fix/gitleaks-pr-base-ref-20261010`; PR #26 remains open and unmerged.
- Latest recorded candidate commit: `844e388b384ceb8d40f7e7361cba174bd20166d7`.
- Latest recorded local migration tree: **68 SQL files**. Remote Supabase ledger: **53 versions**. **53 shared, 15 local-only, 0 remote-only, 0 duplicate local versions**.
- GitHub Actions run `38054630604` (CI): PASS. Run `38054630593` (Local Migration Replay): PASS, including isolated RLS/RBAC and homepage/login smoke tests.
- GitHub Actions run `38054630676` (Database Migration Drift Check): FAIL, correctly fail-closed because 15 local-only versions remain unapplied.
- The ten historical remote-only SQL statements listed in earlier snapshots were recovered into the repository as versioned files. They are no longer remote-only in the latest recorded comparison. Do not continue reporting the earlier 58/53, 43 shared, 10 remote-only snapshot as current.
- Full dependency tree still reports 40 advisories (2 low, 9 moderate, 25 high, 4 critical); production-only audit reported zero, which does not clear the full dependency tree.
- Vercel is currently constrained by the free-plan build-rate limit; the project was reported `live=false` with deployment target `null`. A preview HTTP 200 is not proof of a production release.

## Local-only versions — candidates, not approved writes

`20260905130001`, `20260905130100`, `20260908100000`, `20260908110000`, `20260908120000`, `20260909100000`, `20261003120000`, `20261003140000`, `20261005100000`, `20261007120000`, `20261007130000`, `20261010120000`, `20261010130000`, `20261010140000`, `20261010150000`.

These versions remain unapplied according to the latest recorded ledger comparison. For each one, preserve the exact SQL and record APPLY, SKIP with schema-equivalence evidence, or UNRESOLVED. Do not infer a decision from a filename alone.

## Production security and schema blockers

The latest recorded read-only remote audit identifies:

- Remote `ai_usage_logs_status_check` permits only `success/error`, while the candidate quota lifecycle requires `reserved`.
- Existing remote advisor holdings/snapshot policies are broader than the intended assigned-client scope.
- Remote schema lacks performance/cash-flow/benchmark objects, Company Operations/billing tables, Telegram gateway tables, and `idx_missing_symbols`.
- Security advisor findings include five authenticated-callable SECURITY DEFINER functions and six RLS-enabled tables without policies. Review each function's intended public API and each table's access model before changing grants/policies.
- PostHog event ingestion and Sentry event capture have not been proven end-to-end.

## Required next steps

1. Re-run the read-only drift audit on the exact current PR head and reconcile its output with this report.
2. Inspect the original SQL and actual remote schema/function/ACL/RLS effects for every one of the 15 local-only versions. Document APPLY, SKIP, or UNRESOLVED with evidence.
3. Resolve the five SECURITY DEFINER execution warnings and six RLS/no-policy findings with least-privilege changes and behavioral tests; do not blindly revoke intended application RPCs without checking callers.
4. Review and remediate high/critical dependency advisories using tested, lockfile-consistent updates; do not use force upgrades or weaken the gate.
5. Verify a restorable backup/rollback path on the existing free plan before considering any production write. No production migration or ledger repair is authorized by this report.
6. Re-run all required checks on the final candidate, resolve the free-plan Vercel deployment blocker without a paid upgrade, and prove production reachability plus Sentry/PostHog ingestion before lifting the release hold.

## Safety record

No production migration, ledger repair, reset, production data write, deployment promotion, DNS mutation, or paid resource activation was performed as part of this report. Do not run `supabase db push`, migration repair, or production SQL writes while any version remains UNRESOLVED.


## Follow-up read-only reconciliation — 2026-10-10 (latest head)

The exact current PR #26 head is `dee26ca83245139cdc0994008f335405bdd20827`. The latest workflow set now shows **Local Migration Replay PASS** (run `38060616081`), while Drift Check (run `38060616089`) and CI (run `38060616096`) fail. The local replay completed successfully, including migration replay from an empty local database, RLS/RBAC behavior tests, and browser smoke tests. This does not prove remote migration parity.

### Confirmed workflow failure causes

- Drift authorization invariant: remote RPC `public.reserve_ai_quota` is missing. This is a real schema gap because the quota candidate migration introduces that function.
- Drift parity: the live remote ledger still has 53 versions and the branch has 68 SQL files (53 shared, 15 local-only, 0 remote-only). The audit fails closed; it did not apply any migration.
- CI dependency gate: the production-only dependency audit passed, but the full dependency tree gate failed. It explicitly reported unresolved high/critical advisories for `@vitest/coverage-v8`, `vitest`, `tinypool`, `vercel`, `vite`, `fast-glob`, `micromatch`, `ts-morph`, and several Vercel transitive packages. Do not suppress the gate or apply blind force/major upgrades.

### Per-version preliminary disposition from live read-only schema evidence

These are *review dispositions*, not permission to write to production. APPLY means the SQL appears to fill a confirmed gap and must first pass isolated staging plus behavioral tests. UNRESOLVED means schema equivalence, data migration, or security semantics still need proof.

| Local-only version | Evidence from current remote read-only inspection | Preliminary disposition |
|---|---|---|
| `20260905130001` | Security advisor still reports six RLS-enabled tables without policies, including case-analysis/notes, deletion verification codes, ETL logs, methodologies and methodology versions. | **APPLY in isolated staging**, after verifying each policy predicate and admin/owner access tests. |
| `20260905130100` | The related financial RPCs exist remotely, but existence alone does not prove the deployed function bodies, grants, and owner guards equal this SQL. | **UNRESOLVED** — compare definitions/ACLs and run owner-isolation tests. |
| `20260908100000` | `portfolio_cash_flows` is absent from the remote table inventory. | **APPLY in isolated staging**, after validating cash-movement backfill, trigger idempotency and RLS. |
| `20260908110000` | Remote `idx_etl_logs` lacks `expected_count`, `missing_count`, and `duplicate_count`; `idx_missing_symbols` is absent. | **APPLY in isolated staging**, after testing ETL retry/fencing and admin-only visibility. |
| `20260908120000` | `plans`, `features`, `plan_entitlements`, and `company_subscriptions` are absent. | **APPLY in isolated staging**, after entitlement, capacity, and billing-state tests. |
| `20260909100000` | Telegram gateway tables are absent from the remote inventory. | **APPLY in isolated staging** only after Telegram identity, master-gate, invite expiry/revocation, and RLS tests pass. |
| `20261003120000` | Financial RPCs exist, but current function bodies and ACLs have not been proven equivalent to this corrective migration. | **UNRESOLVED** — compare exact definitions and concurrency/ownership behavior. |
| `20261003140000` | Remote cash policies already show assigned-client scope, but holdings and portfolio-snapshot SELECT/INSERT/UPDATE policies still allow any advisor rather than only assigned clients. | **UNRESOLVED / partial schema equivalence** — do not treat this version as fully applied; validate the exact remaining policy delta. |
| `20261005100000` | `user_sub_roles` exists remotely, but table constraints, policies, grants and `has_role` body still need semantic comparison against the migration. | **UNRESOLVED** — no ledger repair based on table existence alone. |
| `20261007120000` | Remote `idx_financial_ratios` lacks all five proposed period/source/fetch columns. | **APPLY in isolated staging**, after confirming the intended fiscal-period model and duplicate handling. |
| `20261007130000` | It requires every existing ratio row to have a fiscal year and quarter immediately after the prior migration adds those columns as nullable. Existing rows would therefore need an explicit backfill/deduplication step between these migrations. | **UNRESOLVED** — fix migration sequence/backfill and prove duplicate handling before considering apply. |
| `20261010120000` | Remote `ai_usage_logs_status_check` allows only `success/error`; `reserve_ai_quota` is missing. | **APPLY in isolated staging**, after reservation/finalization, caller ownership, positive-token and concurrency tests. |
| `20261010130000` | Remote holdings and snapshot policies currently grant broader advisor access than assigned-client scope. | **APPLY in isolated staging**, after positive and negative advisor/client RLS tests. |
| `20261010140000` | `sync_user_roles_app_metadata`/trigger behavior and backfill have not been proven equivalent from a read-only existence check. | **UNRESOLVED** — verify trigger target, role source, and claim update semantics before apply. |
| `20261010150000` | `handle_new_user` exists remotely, but its body, trigger wiring, and grants have not been proven equivalent to canonical `user_sub_roles` provisioning. | **UNRESOLVED** — verify signup fixtures and service-role-only execution. |

### What changed after the previous snapshot

- Local replay is now **completed PASS** on the exact current head.
- The earlier status “local replay still running” is superseded.
- Remote authorization inspection now confirms the missing `reserve_ai_quota` RPC and the broad advisor holdings/snapshot policies.
- The ratio-period pair has a sequencing hazard: the enforcement migration cannot safely follow the nullable-column migration without an explicit backfill/deduplication step.
- No production migration, ledger repair, deployment promotion, DNS mutation, or paid feature was used to obtain these results.


## Latest continuation — 2026-10-10, exact PR #26 head `b9d82f2e11886a96f6d8d42115059b826212afab`

This section supersedes the earlier workflow statuses above wherever their commit SHA or run IDs differ.

- Current CI run `38060959685`: **FAIL**. Lint, type-check, build, Supabase admin guard, unit tests, secret scan, and production-only dependency audit passed. The full dependency audit failed on unresolved high/critical advisories listed below. Integration/E2E was skipped because the Quality/build job failed.
- Current local migration replay run `38060959710`: **PASS**.
- Current database drift run `38060959741`: **FAIL**. The read-only authorization-invariant step and migration-parity step both fail; Vercel's read-only project audit and Supabase advisor step completed.
- The full dependency gate reported unresolved advisories: `@ts-morph/common`, `@vercel/backends`, `@vercel/cervel`, `@vercel/elysia`, `@vercel/express`, `@vercel/fastify`, `@vercel/h3`, `@vercel/hono`, `@vercel/hydrogen`, `@vercel/koa`, `@vercel/nestjs`, `@vercel/node`, `@vercel/redwood`, `@vercel/remix-builder`, `@vercel/static-build`, `@vercel/static-config`, `@vitest/coverage-v8` (critical, direct), `braces`, `fast-glob`, `micromatch`, `tinypool` (critical), `ts-morph`, `vercel` (direct), `vite`, and `vitest` (critical, direct). The current workflow's documented exception for one dev-only `braces` advisory did not match the returned package metadata, so it remains blocked; do not broaden the allowlist to make CI green.
- The latest Supabase advisor output additionally identifies duplicate indexes on `audit_logs`, `eod_prices`, `holdings`, `kbai_index`, `notifications`, `portfolio_snapshots`, and `transactions`, and multiple permissive policies on `user_2fa` and `user_sub_roles`. These are performance warnings requiring definition/usage checks before removing indexes or combining policies; they are not permission to run immediate production DDL.
- Migration `20261007120000_idx_ratio_periods.sql` adds fiscal period columns as nullable and creates a unique index; `20261007130000_enforce_idx_ratio_periods.sql` immediately raises if any row has a NULL year/quarter and then sets NOT NULL. A clean empty-database replay does not exercise legacy production rows. Keep this pair unresolved until a read-only profile of actual existing ratio rows and duplicate keys supports a deterministic backfill/quarantine plan.
- PR #24 remains open and unmerged at head `f5167e5f26f6d4b372844149afb892e06c031c49`. PR #26 remains open, draft, and unmerged at the head above. Do not merge either solely because local replay passes.
- No production migration, migration-ledger repair, production data write, paid-tier activation, or deployment promotion was performed during this continuation.
