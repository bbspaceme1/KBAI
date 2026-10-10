# Runbook: Supabase Migration Reconciliation and Release

Production is **HOLD** until migration history is reconciled, clean local replay and authorization tests pass, and a restorable backup is verified. This runbook uses free local tooling first and must not create paid resources.

## 1. Free preflight

1. Confirm the exact Git commit and a clean working tree.
2. Run the local Supabase workflow (GitHub Actions uses the free local Docker stack):
   - `supabase start`
   - `supabase db reset --local`
   - `npm run test:rls`
   - `npx playwright test e2e/basic.spec.ts --project=chromium`
3. Run `npm run test:run`, `npm run lint:ci`, `npx tsc --noEmit`, and `npm run build`.
4. Do not use production credentials for test data. Never create test/admin users in production.

A separate Supabase staging project is optional and must remain on a verified free plan. Do not create a Supabase branch, upgrade a plan, enable a paid backup feature, or provision any paid resource to get green checks. If a required test cannot run without a paid feature, report it as blocked instead of bypassing it.

## 2. Reconcile migration history

1. Compare local migration versions with the remote `supabase_migrations.schema_migrations` ledger.
2. For every local-only or remote-only version, inspect the original SQL (never reconstruct from a filename), current function definitions, RLS policies, grants, constraints, indexes, and affected data.
3. Record one explicit decision per version: **APPLY**, **SKIP with schema-equivalence evidence**, or **UNRESOLVED**.
4. Do not run `supabase migration repair`, `supabase db push`, or a production SQL write while any version is UNRESOLVED.
5. Remote-only migration SQL must be recovered from an authoritative source. Do not create no-op placeholder files to make version lists match.

## 3. Backup and release gates

Before any production migration:

- Confirm the current plan includes a usable backup/export method at no additional charge.
- Create a schema and data backup using the approved free method; keep it outside the repository and protect it as sensitive data.
- Verify that the backup can be restored into the isolated local Supabase stack. A backup that has not been restore-tested is not a rollback plan.
- Record the exact commit, migration list, backup timestamp/location, test results, and an operator-approved rollback decision.
- Require all migration versions to be reconciled, clean local replay to pass, the RLS authorization matrix to pass, and build/quality checks to pass.

If a restorable backup cannot be produced on the current free plan, stop. Do not enable a paid backup/PITR feature without explicit authorization.

## 4. Production rollout

Only after all gates above are satisfied and the production hold is explicitly lifted:

1. Re-run the read-only drift check and verify there are no unexplained differences.
2. Apply only the reviewed pending migrations in the approved order.
3. Run read-only post-deployment checks for function definitions, grants, RLS policies, columns, indexes, and critical row counts.
4. Deploy the exact tested commit to Vercel production.
5. Run public-domain smoke tests and verify Sentry error capture and sanitized PostHog pageview ingestion.
6. Keep the previous production deployment available for application rollback.

Do not combine migration application, ledger repair, and application deployment into one unverified step.

## 5. Rollback plan by change type

| Change type | Recovery approach |
| --- | --- |
| Additive tables/columns/indexes | Prefer a forward corrective migration. Do not drop objects after application data may have been written. |
| RPC/function security or grants | Apply a reviewed compensating migration restoring the last known-good function body and grants; re-run the authorization matrix. |
| RLS policies | Restore the last reviewed policy set with a compensating migration; immediately verify owner, admin, assigned-advisor, unassigned-advisor, and anonymous access. |
| Backfills/data transformations | Stop writes, compare affected row counts, and restore from the verified backup or a deterministic reverse script. Never assume a schema rollback reverses data. |
| Vercel deployment/config | Promote the previous known-good deployment and restore the previous environment-variable values; verify domain protection and login. |
| Sentry/PostHog browser telemetry | Revert the application commit or remove the public SDK configuration. These integrations must fail closed/no-op when keys are absent and must not block login or portfolio access. |

After any failed production step, stop immediately. Do not blindly retry, delete migration-ledger rows, or use `db reset` against production. Escalate for explicit human review.
