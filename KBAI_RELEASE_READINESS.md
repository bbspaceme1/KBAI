# KBAI Release Readiness

Updated: 2026-10-03
Repository: `bbspaceme1/KBAI`
Baseline: verify with `git rev-parse origin/main` at release time; this working branch contains the current reconciliation changes
Working branch: `feature/reconciliation-release-readiness`

## Executive status

**NOT PRODUCTION READY.** This is based on verified repository and remote audit evidence. No claim of production migration, deployment, smoke test, or RLS behavioral verification is made in this document.

## Verified state

| Area                       | Status          | Evidence                                                                                                         |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| GitHub baseline            | VERIFIED        | Current release branch and `origin/main` resolve to the reconciliation branch tip; verify final SHA after commit |
| TypeScript                 | PASS            | Prior recorded `npm run type-check` result                                                                       |
| Lint                       | PASS            | Prior recorded `npm run lint:ci` result                                                                          |
| Unit tests                 | PASS with skips | Current rerun: 131 passed, 5 skipped, 3 todo; RLS file remains skipped                                           |
| Build                      | PASS            | Prior recorded `npm run build` result                                                                            |
| Coverage                   | BLOCKED_RELEASE | Lines/statements 18.85%, functions 32.34%, branches 64.25%                                                       |
| RLS behavior               | BLOCKED_ENV     | Negative matrix skipped without staging identities                                                               |
| E2E                        | BLOCKED_ENV     | Browser launch failed because host libraries were unavailable                                                    |
| Dependencies               | BLOCKED_RELEASE | `npm audit --omit=dev`: 24 advisories, including 8 high; `xlsx` has no fix                                       |
| Supabase migration lineage | PARTIAL         | Local duplicate check passes; remote migration history/parity is not fully captured                              |
| Supabase security          | PARTIAL/BLOCKED | RPC ACL/search_path and forward RLS correction applied; body ownership and behavioral RLS remain unverified      |
| Vercel                     | BLOCKED_ENV     | API identity returned 404; team/project reads returned 403                                                       |

## Database and migration blockers

No production migration has been applied. The duplicate timestamp must not be resolved by editing applied history or blindly running `supabase db push`. The next database PR must first establish staging lineage, identify which duplicate migration is represented remotely, then use a new unique migration for any additive repair. Emergency Fund persistence and Company Operations persistence/RLS/seed objects are not verified remotely.

## Company Operations

The repository contains a tested authorization foundation, but persistence, seeded roles/permissions, approval requests, atomic state transitions, audit persistence, RLS, server CRUD, and E2E authorization remain pending migration and integration work.

## Emergency Fund

The repository contains the calculation engine and UI foundation. Persistence, history, versioned snapshots, audit metadata, RLS, server contract, and retrieval integration remain pending migration and staging verification.

## Entitlement and billing

Runtime entitlement uses `company_subscriptions`; Midtrans settlement processing now validates the order-bound UUID, matches the amount to an active canonical plan, and persists `company_subscriptions` plus idempotent `payments`. This is source-verified and covered by billing/entitlement unit tests, but remains `PARTIAL`: the generated Supabase types are stale, the two-record webhook write is not yet a single database transaction, and live signature/replay/payment lifecycle tests were not executed.

## Telegram and market data

Telegram replay protection, membership synchronization, webhook behavior, and invite lifecycle remain unverified against live staging. Official IDX provider configuration and freshness behavior remain unverified; the application is fail-closed when the official provider is not configured.

## CI/CD and Vercel

Repository workflows include quality/build and production deployment paths, but the latest recorded deployment verification was blocked by Vercel authorization. The production deployment ID, Ready state, domain, commit mapping, and HTTP smoke result are therefore intentionally not claimed.

## Remaining blockers

1. Resolve Supabase migration lineage and duplicate timestamp in staging.
2. Harden and behavior-test caller-sensitive financial RPCs.
3. Provide staging identities for RLS negative tests.
4. Add and verify Emergency Fund and Company Operations migrations, RLS, grants, seeds, and server workflows.
5. Make entitlement/billing runtime enforcement and webhook idempotency executable and tested.
6. Restore Vercel team/project read authorization and verify deployment-to-commit mapping.
7. Install browser host dependencies and run critical E2E/a11y/mobile checks.
8. Reconcile generated Supabase types and move billing settlement persistence into an atomic server-side transaction/RPC.
9. Remediate or formally accept production dependency advisories.
10. Raise meaningful security/domain coverage; do not inflate metrics.

## Rollback and safety

No production mutation was performed by this update. Database changes require reviewed additive migrations, staging execution, schema/RLS verification, application tests, E2E, explicit approval, and a documented rollback strategy before production.

## Evidence references

- `KBAI_RECONCILIATION_PROGRESS.md`
- Supabase audit run references recorded there: `37012250480`, `37013281680`
- GitHub baseline merge commit: `0248d7f75a5e69bd924c701684dd51892b86f130`

This file records verified status only; it is not evidence that blocked gates passed.

## Recommended next PR order

1. Database lineage and staging reconciliation.
2. Financial RPC ownership and RLS behavioral tests.
3. Emergency Fund and Company Operations persistence/workflows.
4. Entitlement/billing and Telegram live integration tests.
5. Critical E2E, accessibility, mobile, and performance gates.
6. Dependency remediation and enforced coverage thresholds.
7. Vercel authorization and deployment smoke verification.
