# KBAI PR Merge Matrix

Audit timestamp: 2026-10-11 UTC
Candidate branch: `v0/release-runtime-hardening`
Candidate SHA: `665e314df1fdcb40092a34fbc4c8176f99b45832`
Base branch SHA observed: `8d7aa8f9ae0ff808b317d1de9b411c631ebfc357`

| PR  | Branch / head                                   | Scope                                                                    | Overlap / dependency                                                                                 | Status               | Decision                                                                          |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| #24 | `v0/release-runtime-hardening` / `665e314`      | IDX ETL reliability, checkpoint fencing, CI audit artifacts              | Owns ETL migrations; overlaps CI/report files with #26                                               | OPEN, blocked        | Do not merge until CI, migration drift, and integration gates pass                |
| #26 | `fix/gitleaks-pr-base-ref-20261010` / `945d37e` | PRD, production readiness, auth/RLS/quota tests, migration documentation | Overlaps CI, package lock, RLS tests, and readiness docs with #24; contains many security migrations | OPEN, draft, blocked | Resolve against current main and #24 after disposition review; do not merge draft |
| #28 | `feat/company-os-all-account-types` / `de8785b` | Company OS account types and authorization catalog                       | Adds RBAC/case migrations; must follow security/RLS reconciliation                                   | OPEN, draft, blocked | Require schema review and behavioral tests before readiness                       |

No PR was merged during this audit. No review approval, required-check bypass, or force push was performed.

Evidence: GitHub PR API and workflow API queried on 2026-10-11. Current workflow failures include missing staging fixture secrets in Integration/E2E and migration drift/security-advisor findings.

## Required integration order

1. Reconcile migration and security changes from #26 and #28 against `main`.
2. Keep #24 ETL migrations ordered after the reconciled schema contract.
3. Run the complete candidate suite on one combined SHA.
4. Merge only after required checks and review policy pass.

## Blockers

- Staging URL and authenticated RLS fixtures are empty in the GitHub environment.
- Remote Supabase schema/ledger/advisor access is unavailable in this session because the Supabase MCP authorization requires renewal.
- Migration drift is not dispositioned; no ledger repair or production migration is authorized.
- Vercel/deployment and observability runtime evidence is not verified on this candidate.

Status: **HOLD**.
