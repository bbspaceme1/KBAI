# Company OS Release Gate — Migration and Authorization Reconciliation

Status: **BLOCKED — do not merge or apply to production**.

## Evidence captured from GitHub Actions run 38113328864

- Quality and build job passed, including `npm ci`, production and full dependency audits, secret scan, lint, type check, build, admin guard check, and unit tests.
- Migration drift job failed with exit code 1.
- Integration/E2E job failed at "Validate isolated staging integration secrets"; behavioral RLS and E2E tests were skipped.
- The workflow confirmed the production Supabase project link and completed read-only schema inventory plus Supabase security/performance advisors.

## Exact migration-ledger difference reported by the workflow

Local-only versions:
- 20260905130001
- 20260905130100
- 20260906120000
- 20260908100000
- 20260908110000
- 20260908120000
- 20260909100000
- 20261003120000
- 20261003140000
- 20261005100000
- 20261007120000
- 20261007130000
- 20261011120000
- 20261011120100
- 20261011120200
- 20261011120300

Remote-only versions:
- 20261002183536
- 20261002183606
- 20261002183624
- 20261002183633
- 20261002183716
- 20261002183743
- 20261002183752
- 20261002183831
- 20261002183853
- 20261003075330
- 20261010150752

The four Company OS versions are expected to be local-only until an approved deployment. The older local-only/remote-only versions are the pre-existing history mismatch and must be reconciled against each exact SQL file and current schema. Do not mark versions applied or replay them solely to silence the gate. Some remote-only versions concern financial RPC ownership, advisor scope, and security hardening, so reconstructing or renaming files requires content-level equivalence review.

## Production enum evidence

The production `public.app_role` enum currently contains:
`admin`, `user`, `advisor`, `super_admin`, `portfolio_advisor`, `equity_analyst`, `research_analyst`, `data_analyst`, `customer_support`, `engineer`, `ai_agent`.

The proposed migration adds six values. The additive enum migration is timestamped before the permission-seed migration that references those values; preserve this separation because PostgreSQL enum values should not be consumed in the same transaction in which they are added.

## Integration secrets blocking real access tests

The workflow shows these values are missing/empty:
- `E2E_URL`
- `RLS_TEST_USER_A_TOKEN`
- `RLS_TEST_USER_A_ID`
- `RLS_TEST_USER_B_ID`
- `RLS_TEST_ADVISOR_TOKEN`
- `RLS_TEST_ADVISOR_ID`
- `RLS_TEST_ASSIGNED_CLIENT_ID`
- `RLS_TEST_UNASSIGNED_CLIENT_ID`

The Supabase URL, anon key, and service-role key were present. Do not put secret values in repository files or PR comments. Configure only isolated staging test identities and IDs as repository Actions secrets/variables.

## Required gates before release

1. Compare each divergent migration file with the corresponding production schema change. Establish which local-only files are genuinely unapplied, which remote-only changes were applied outside the checked-in migration history, and whether any are semantically equivalent under a different filename.
2. Preserve immutable historical migration files. Use a forward-only reconciliation migration only after proving the production schema state; never fake history to make a green check.
3. Apply the four new migrations to an isolated staging database and verify enum additions, idempotent backfills, legacy role mappings, and absence of duplicate role-assignment sources. `user_sub_roles` remains canonical.
4. Implement authorization in actual server/API/RLS paths. The permission catalog and role-permission matrix are metadata only until runtime code and data policies consume them. Enforce ownership/scope, entitlement state/expiry, approval for sensitive actions, and audit recording.
5. Run positive and negative behavioral tests for User A versus User B, active/inactive customer entitlement, assigned/unassigned advisor, Finance, admin, Control, and service-role boundaries. Service-role tests must prove it is never exposed to browser code.
6. Require migration drift, staging RLS, E2E, build, security, and deployment checks to pass before marking PR #28 ready, merging, applying production migrations, or promoting a deployment.
7. After release, verify the exact production deployment SHA, health/login, role-scoped workflows, and audit evidence. A successful build or a READY preview alone does not prove production release.

## Explicit non-actions

No production migration was applied, no PR was merged, and no production deployment was promoted as part of this investigation.
