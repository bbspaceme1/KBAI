# Deploy workflow failure diagnosis — 2026-10-12

## Scope and method

Read-only review of GitHub Actions run metadata/logs, Supabase migration history, and Vercel deployment metadata. No secrets were read, changed, or printed. No production database writes or deployment mutations were performed.

## Findings

### Latest main deployment workflow

- Workflow run: [Deploy #37637342914](https://github.com/bbspaceme1/KBAI/actions/runs/37637342914)
- Candidate commit: `8d7aa8f9ae0ff808b317d1de9b411c631ebfc357`
- Job `Required database drift gate / Check migration drift`: **FAIL** at step 7, `Check migration drift`.
- Job `Required quality, integration and E2E gates / Integration and E2E`: **FAIL** at step 7, `Validate isolated staging integration secrets`.
- Job `Deploy to Vercel production`: **SKIPPED** because required gates did not pass.
- Quality/build and read-only Vercel audit jobs: **PASS**.

### Hypotheses

| Hypothesis | Status | Evidence |
|---|---|---|
| Vercel deploy credentials absent | REJECTED for the checked run | The read-only Vercel audit and required-secret presence step passed; values were not read. |
| Migration drift blocks release | CONFIRMED | Run #37637342914 logs list local-only and remote-only migration versions and exit code 1. |
| CI quality/lint/build fails | REJECTED for this run | Quality and build job concluded success. |
| Staging E2E/RLS secret set incomplete | CONFIRMED | Integration job failed at the required-secret validation step. |
| Smoke/commit verification is the first failure | REJECTED for this run | Production deploy job was skipped before smoke/commit verification could run. |
| Git-triggered Vercel Production deployment canceled by Ignored Build Step | CONFIRMED as a Vercel deployment state; intended configuration UNKNOWN | Recent Production deployments are CANCELED; the project remains `live=false`, SSO-protected, and the latest deployment target is null/queued. |

## Missing staging secret names

The log for [CI run #38236357825](https://github.com/bbspaceme1/KBAI/actions/runs/38236357825) showed these values were empty in the staging environment (only names are recorded here):

- `E2E_URL`
- `RLS_TEST_USER_A_TOKEN`
- `RLS_TEST_USER_A_ID`
- `RLS_TEST_USER_B_ID`
- `RLS_TEST_ADVISOR_TOKEN`
- `RLS_TEST_ADVISOR_ID`
- `RLS_TEST_ASSIGNED_CLIENT_ID`
- `RLS_TEST_UNASSIGNED_CLIENT_ID`

Do not point `E2E_URL` or these test identities at production. Use an isolated staging environment with disposable test users and data.

## Migration differences observed

The migration drift job reported these local-only versions, in addition to the remote-only versions now being restored in Draft PR #30:

`20260905130001`, `20260905130100`, `20260906120000`, `20260908100000`, `20260908110000`, `20260908120000`, `20260909100000`, `20261003120000`, `20261003140000`, `20261005100000`, `20261007120000`, `20261007130000`.

These must be classified from their SQL and production schema effects. Do not delete files, fabricate ledger rows, or apply migrations to production just to make the gate green.

## Recommended minimal actions

1. Complete the local empty-database replay gate in Draft PR #30 and review the first failing migration, if any.
2. For each local-only migration, determine whether it is an intended pending schema change, a duplicate, or an obsolete proposal. Apply to staging only after review; production requires separate human approval.
3. Populate the eight missing staging secret values through GitHub's environment secret UI using isolated staging test data. Never commit or print the values.
4. Preserve the deployment gate. Re-run the Deploy workflow only after drift and staging RLS/E2E checks pass.
5. Separately inspect Vercel's Ignored Build Step configuration. Do not disable it blindly: it may be intentionally preventing a second competing production deployment path while `.github/workflows/deploy.yml` is intended to be the only production path.

## Backup and restore gate

The available Supabase project metadata confirms project status and region, but does not prove backup/PITR configuration or a successful restore. A human must verify the dashboard settings and provide dated restore-test evidence before production migrations are approved.
