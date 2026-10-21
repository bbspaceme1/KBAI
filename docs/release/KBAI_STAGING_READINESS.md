# KBAI Terminal — Staging Readiness

**Status:** BLOCKED — isolated Supabase staging project provisioned at $0, but schema replay, test users/secrets, and verified dependency lockfile update remain incomplete.  
**Baseline checked:** 2026-10-21  
**Repository:** `bbspaceme1/KBAI`  
**Baseline main SHA:** `8d7aa8f9ae0ff808b317d1de9b411c631ebfc357`  
**Production Supabase project ref (do not use for tests):** `ejiufnrqvkvqzxroustb`  
**Isolated staging Supabase project ref:** `ffixgojmdhbyouucdpyn`  
**Isolated staging API URL:** `https://ffixgojmdhbyouucdpyn.supabase.co`  
**Supabase organization:** `aklzlekyqzmkjunvswkn`  
**Vercel project:** `kbaiterminal` (`prj_CE5uqT2B3WAtHYZsXsNMz7TqFESA`)

## Safety and cost decision

The owner approved **free-only** staging. The Supabase development branch cost check returned **$0.01344 per hour**, so no paid branch was created. A separate project quote returned **$0/month**; isolated project `kbai-staging-isolated` (`ffixgojmdhbyouucdpyn`) was created in `ap-northeast-2` and reported `ACTIVE_HEALTHY`. Its database currently has **zero public tables and zero migrations**. It has no production data; production was not modified. Do not run RLS/E2E against it until the reviewed schema/migrations and synthetic users are provisioned.

## Evidence baseline

| Area | Observed state | Status |
|---|---|---|
| GitHub main | SHA `8d7aa8f9ae0ff808b317d1de9b411c631ebfc357`; branch protected | VERIFIED |
| GitHub open PR search | PR #24 found: “Strengthen IDX data contract and ETL reliability”; search results do not prove this is the only open PR | PARTIAL |
| Supabase config | `supabase/config.toml` points to `ejiufnrqvkvqzxroustb` | VERIFIED |
| Supabase production branches | Only `main` returned; status `MIGRATIONS_FAILED`; no paid branch created | BLOCKED |
| Isolated staging project | `ffixgojmdhbyouucdpyn`, `ACTIVE_HEALTHY`, API URL verified, zero migrations/tables | PROVISIONED / SCHEMA PENDING |
| Supabase migration ledger | 49 remote entries returned, from `20260418154440` through `20261011193304`; this is a ledger count, not proof of schema parity | VERIFIED / PARITY NOT CHECKED |
| Supabase Security Advisor | 2 RLS-enabled tables without policies; 2 extensions in `public`; 3 SECURITY DEFINER functions callable by `authenticated`; leaked-password protection disabled | FAIL |
| Vercel project | `live=false`; latest deployment state `READY`, target `null`; SSO protection enabled | BLOCKED for public/Production verification |
| Vercel env inventory | 67 entries returned; duplicates exist; some server-sensitive entries are scoped to Preview and Production | REVIEW REQUIRED |
| CI workflow | `.github/workflows/ci.yml` has an integration job using GitHub environment `staging` and requires isolated test secrets | CONFIG PRESENT; EXECUTION NOT VERIFIED |
| Sentry/PostHog | No successful staging event-ingestion evidence captured in this run | NOT VERIFIED |
| Cloudflare | Account inspection returned an internal tool error | BLOCKED / NOT VERIFIED |

## Staging architecture

1. GitHub pull request branch triggers CI and a Vercel Preview deployment.
2. Preview must use a dedicated staging Supabase URL and publishable key.
3. Any server-side credentials must belong to the isolated staging database and stay server-only.
4. Never copy Production database credentials into Preview or GitHub staging secrets.
5. Use synthetic test users/data only. Do not copy Production data.
6. Sentry and PostHog must identify events as staging and must not capture secrets, private portfolio data, or sensitive URL parameters.
7. Do not change DNS, Production environment variables, Production schema, or Production deployment during staging bootstrap.

## Required owner-managed settings

Configure through approved secret managers/settings UI; never paste values into issues or commits:

- GitHub Actions environment `staging`: `E2E_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RLS_TEST_USER_A_TOKEN`, `RLS_TEST_USER_A_ID`, `RLS_TEST_USER_B_ID`, `RLS_TEST_ADVISOR_TOKEN`, `RLS_TEST_ADVISOR_ID`, `RLS_TEST_ASSIGNED_CLIENT_ID`, `RLS_TEST_UNASSIGNED_CLIENT_ID`.
- All values must reference only the isolated test database and test accounts.
- Vercel Preview: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must target staging; do not expose server secrets through `VITE_*` variables.
- Sentry/PostHog staging configuration must use the intended project and explicit staging environment.

## Release gates (do not mark PASS without evidence)

- [x] Isolated zero-cost database provisioned (`ffixgojmdhbyouucdpyn`); project API URL confirmed from project metadata.
- [ ] Staging schema/migrations replayed and connectivity verified from CI.
- [ ] Clean migration replay from empty database.
- [ ] Upgrade/reconciliation replay and schema parity verified.
- [ ] RLS/RBAC positive and negative tests pass for User A/B and assigned/unassigned advisor.
- [ ] Auth, entitlement, AI quota, and privileged RPC tests pass.
- [ ] `npm ci`, lint, typecheck, build, unit tests, dependency audit, secret scan pass on candidate SHA.
- [ ] E2E/browser smoke tests pass against Preview and isolated staging only.
- [ ] Client bundle checked for server secrets.
- [ ] Sentry and PostHog staging test events confirmed by querying actual ingestion.
- [ ] Preview URL, commit SHA, environment target, and login flow verified.
- [ ] Security Advisor findings reviewed and remediated in a tested migration or approved Auth setting.
- [ ] Evidence artifacts saved with timestamp and SHA; no secrets included.

## Known blocking risks

1. **Cost:** Supabase development branch quoted at $0.01344/hour and was not created. A separate staging project was created at a quoted $0/month.
2. **Migration drift:** Supabase branch status is `MIGRATIONS_FAILED`; the 49-row ledger alone does not establish schema parity.
3. **Database access:** `case_analysis` and `case_notes` have RLS enabled without policies. Keep access denied until correct ownership/scope policies are designed and tested.
4. **Privileged RPCs:** `adjust_cash_balance`, `has_role`, and `upsert_holding_buy` are reported executable by `authenticated`; verify intended callers and authorization before changing grants.
5. **Auth:** leaked-password protection is disabled; enable through supported Auth settings after checking plan/availability.
6. **Deployment:** Vercel latest deployment target is null and project reports `live=false`; a READY Preview is not proof of Production.
7. **Observability/Cloudflare:** event ingestion and Cloudflare account scope are not verified.

## Change log

- 2026-10-21: Read-only baseline performed; created `staging/preview-bootstrap` from the current `main` SHA. No Supabase branch, database migration, Production change, DNS change, or environment secret change was performed.


## Follow-up execution — 2026-10-21

- Updated `.github/workflows/ci.yml` on the staging branch at commit `1efee09cb8884cb5096886c8b9c9657b220ffc29` to generate and upload `npm-audit-full.json`, `npm-audit-production.json`, and exit-code metadata under a run-specific GitHub Actions artifact. The artifact upload step uses `if: always()` so a failed audit does not suppress evidence.
- Candidate CI run: https://github.com/bbspaceme1/KBAI/actions/runs/39551771344 (run 290). At last observation, `npm ci` was still running; no final pass is claimed.
- Read-only migration/schema audit run: https://github.com/bbspaceme1/KBAI/actions/runs/39551771423 (run 265). Supabase link and required audit-secret presence checks passed; schema inspection was still running at last observation. This does not authorize or perform migrations.
- Prior completed CI evidence on the earlier candidate showed 40 total npm advisories (2 low, 9 moderate, 25 high, 4 critical) and one high-severity production-surface finding involving Vite 7.0.0–7.3.6 / launch-editor advisories GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, and GHSA-587h-7wmj-h5pm. Do not treat the count as current until the new artifact is retrieved.
- Dependency lockfile was not edited because the connector cannot run npm/registry resolution locally; changing only package.json would make `npm ci` fail or leave an unverified lock. The CI report must identify the patched compatible version before updating both manifest and lockfile together.
- No production migration, production environment change, DNS change, or Supabase paid branch creation occurred.


## Verified CI artifacts and migration drift detail — 2026-10-21

- Dependency audit artifact is available from [CI run 39551771344](https://github.com/bbspaceme1/KBAI/actions/runs/39551771344/artifacts/12324420102), artifact `dependency-audit-json-39551771344-1` (SHA-256 `50b4eff29dc484fcc0ca288f54bc64e96a4a71cb62c9e429b6177fbd162f2f16`). It contains full and production-surface JSON reports plus exit codes.
- The captured audit reports 40 total findings in the full tree (2 low, 9 moderate, 25 high, 4 critical); production surface reports 1 high finding, Vite 7.0.0–7.3.6 with three launch-editor advisories. `npm audit fix` is indicated as available. The current lockfile has not yet been changed; this finding remains open until a compatible patched resolution is installed and CI verifies it.
- Read-only Supabase schema/advisor evidence was produced in [migration audit run 39551771423](https://github.com/bbspaceme1/KBAI/actions/runs/39551771423); the schema inventory artifact is `supabase-schema-audit-df2815c031222614e5f2038c732f236d1a3ca15a`. Security/performance advisors completed. The overall migration job correctly remains failed because history differs.
- Exact migration-history comparison from that run:
  - Local-only versions: `20260905130001`, `20260905130100`, `20260906120000`, `20260908100000`, `20260908110000`, `20260908120000`, `20260909100000`, `20261003120000`, `20261003140000`, `20261005100000`, `20261007120000`, `20261007130000`.
  - Remote-only versions: `20261002183536`, `20261002183606`, `20261002183624`, `20261002183633`, `20261002183716`, `20261002183743`, `20261002183752`, `20261002183831`, `20261002183853`, `20261003075330`, `20261010150752`, `20261011193304`.
  - These differences are not proof that a migration should be applied or inserted into the ledger. Compare SQL effects, current objects, grants, policies, and function definitions individually before classifying each version.
- Advisor evidence includes multiple permissive SELECT policies on `advisor_clients`, `economic_events`, and `macro_indicators`; duplicate/unused indexes on several tables including `audit_logs`, `transactions`, and `case_assignments`. These need impact review; no policy or index was altered by this read-only run.
- The same CI run's quality job failed at the production dependency audit and uploaded the report; later lint/type/build/unit steps were skipped by GitHub Actions because of the fail-fast job sequence. The integration job had passed `npm ci` and was still building at the last captured status; RLS/E2E completion is not claimed.


## Follow-up execution — isolated staging bootstrap — 2026-10-21

- Created Supabase project `kbai-staging-isolated` in organization `aklzlekyqzmkjunvswkn` with quoted cost **$0/month**. Project ref: `ffixgojmdhbyouucdpyn`; API URL: `https://ffixgojmdhbyouucdpyn.supabase.co`. The project is isolated and currently empty (no migrations, no public tables, no production data copied).
- Production Supabase project `ejiufnrqvkvqzxroustb` was not changed. No schema migration or seed data has been applied to either project in this step.
- Registry advisory evidence confirms Vite **7.3.7** as the first fixed version for the cited 7.x launch-editor advisory (source: https://advisories.gitlab.com/npm/vite/CVE-2026-112943/). Current candidate lockfile still resolves Vite **7.3.6**. The package manifest/lockfile were intentionally not hand-edited because this environment cannot reach npm registry and the GitHub connector did not expose a working dispatch path for the temporary resolver workflow; an npm-registry-backed CI resolver and fresh `npm ci`/production audit are still required before this gate can be called fixed.
- GitHub connector does not expose a supported API for writing GitHub Environment secrets or creating Auth user access tokens. Therefore no secret values were invented or written. After the staging schema and synthetic users are provisioned, populate the `staging` environment using only credentials from `ffixgojmdhbyouucdpyn`; never reuse Production keys/tokens.
- No Production environment, DNS, schema, or deployment changes were made.
