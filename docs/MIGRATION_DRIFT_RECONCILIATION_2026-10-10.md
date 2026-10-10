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
