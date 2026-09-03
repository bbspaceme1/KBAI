# Runbook: Apply Supabase Migrations

Use this procedure when a change adds or modifies files in `supabase/migrations/`. A human operator must complete the staging verification before applying migrations to production.

## Prerequisites

- Supabase CLI installed and authenticated with `SUPABASE_ACCESS_TOKEN`.
- Repository checked out at the exact commit being released.
- Access to the Supabase project ref `ejiufnrqvkvqzxroustb`.

## Procedure

1. **Create a Supabase preview/dev branch.** In the Supabase dashboard, create a database branch from the current production state and collect that branch's connection string. Do not use the production connection string for staging verification.

2. **Apply pending migrations to the branch.** Link the CLI to the preview/dev branch or set the branch connection details, then run:

   ```bash
   supabase db push
   ```

3. **Run the test suite against the branch.** Configure the application's Supabase connection variables with the branch connection string and run:

   ```bash
   npm run test:run
   npm run test:e2e
   ```

   Resolve any migration or application failures before continuing.

4. **Take a production backup.** Create and verify a current backup/snapshot of the production database using the Supabase dashboard or the approved backup procedure. Record the backup identifier and timestamp.

5. **Apply the migrations to production.** After the staging tests pass and the backup is confirmed, link the CLI to the production project and run:

   ```bash
   supabase db push --linked
   ```

6. **Confirm the CI gate.** Re-run the `db-drift-check` GitHub Actions workflow and confirm that it reports `Schema in sync`.

## Recovery

If the production push fails, stop and follow the team's database recovery procedure using the recorded backup. Do not retry destructive changes without human review.
