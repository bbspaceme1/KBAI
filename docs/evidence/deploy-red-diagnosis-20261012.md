# Deploy Red Diagnosis — 2026-10-12

## Scope

Read-only diagnosis of the latest known `main` CI/deployment gates. No workflow, Vercel setting, secret, database, or production deployment was changed.

## Baseline

- Repository: `bbspaceme1/KBAI`
- Latest observed `main` SHA: `8d7aa8f9ae0ff808b317d1de9b411c631ebfc357`
- CI run: [38053603011](https://github.com/bbspaceme1/KBAI/actions/runs/38053603011)
- Migration drift run: [38053590767](https://github.com/bbspaceme1/KBAI/actions/runs/38053590767)
- The repository's `deploy.yml` gates Vercel deployment behind quality and database jobs; no deploy job can be inferred as having run unless both prerequisites succeed.

## First failing jobs and steps

| Job                            | First failing step                              | Evidence                                                                                                                                                                                                                                                                                            | Result                                                                    |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Integration and E2E            | `Validate isolated staging integration secrets` | Run log shows `E2E_URL:` empty, `RLS_TEST_USER_A_TOKEN:` empty, `RLS_TEST_USER_A_ID:` empty, `RLS_TEST_USER_B_ID:` empty, `RLS_TEST_ADVISOR_TOKEN:` empty, `RLS_TEST_ADVISOR_ID:` empty, `RLS_TEST_ASSIGNED_CLIENT_ID:` empty, and `RLS_TEST_UNASSIGNED_CLIENT_ID:` empty, followed by exit code 1. | Confirmed                                                                 |
| Quality and build              | `Secret scan`                                   | Job summary reports `Quality and build failure Secret scan`; the available log also contains unresolved dependency audit findings, including high/critical advisories.                                                                                                                              | Confirmed, exact secret finding not available in the retained log excerpt |
| Database Migration Drift Check | `Check migration drift`                         | Run log returns advisor findings such as duplicate indexes on `public.holdings` and `public.kbai_index`; the job is failed/blocked on the drift gate.                                                                                                                                               | Confirmed                                                                 |

## Hypothesis classification

- **H1 — Vercel deployment secrets missing:** UNKNOWN. `gh secret list` was denied with HTTP 403, so secret names/presence could not be independently inspected. No secret value was requested or printed.
- **H2 — Database drift gate fails:** CONFIRMED. Run `38053590767` failed at `Check migration drift`; the log includes duplicate-index advisor findings. This is sufficient to block `deploy` even without proving every drift cause.
- **H3 — Required CI/integration secrets missing:** CONFIRMED. Run `38053603011` shows the validation environment variables empty for E2E and RLS fixtures.
- **H4 — CI test/lint/security gate failure:** CONFIRMED. `Quality and build` failed at `Secret scan`; the exact detector line was not available in the retained output. Dependency audit findings are also present in the run log and must not be suppressed.
- **H5 — Smoke test or commit verification failure:** NOT RUN / UNKNOWN. The deploy job is downstream of failed quality and database gates, so no evidence shows that Vercel deploy, public smoke, or commit verification executed for this run.

## Required secret names

The workflow references these names; their configured presence is **UNKNOWN** because GitHub returned HTTP 403 for the secrets listing:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `E2E_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `RLS_TEST_USER_A_TOKEN`
- `RLS_TEST_USER_A_ID`
- `RLS_TEST_USER_B_ID`
- `RLS_TEST_ADVISOR_TOKEN`
- `RLS_TEST_ADVISOR_ID`
- `RLS_TEST_ASSIGNED_CLIENT_ID`
- `RLS_TEST_UNASSIGNED_CLIENT_ID`

## Minimal fixes, without executing them

1. A repository owner should inspect GitHub Actions secret names and scopes, then provision only the missing non-production test fixtures and deployment identifiers through GitHub's secret manager. Never paste values into chat or commits.
2. Resolve the migration ledger/schema drift and duplicate-index findings through reviewed Git migrations; do not use remote repair/reset or apply production changes from this diagnosis.
3. Obtain the exact `Secret scan` detector output from the GitHub Actions UI or a token with permitted job-log access, then remediate the specific finding rather than weakening the scan.
4. Re-run the gates on one candidate SHA. Only after quality and database gates pass can the Vercel CLI deploy and smoke/commit verification be evaluated.

## Outcome

The latest observed production pipeline is blocked before Vercel deploy. This report does not claim that Vercel secrets are absent, that a production deployment was attempted, or that smoke verification failed.
