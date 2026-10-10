# GitHub Actions Secret Names

Masukkan nama berikut satu per satu di:
`GitHub repository > Settings > Secrets and variables > Actions > New repository secret`.

## CI

Secret berikut dipakai oleh workflow `CI`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `SENTRY_DSN`
- `VITE_POSTHOG_KEY`

## Database

Secret berikut dipakai untuk menghubungkan workflow migration drift ke Supabase:

- `SUPABASE_ACCESS_TOKEN`

## Vercel

Secret berikut dipakai untuk deploy production:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## ETL Dan Alert

Workflow ETL dan alert juga memakai nama secret berikut melalui mapping yang sudah ada:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Tidak perlu membuat secret bernama `SUPABASE_SERVICE_KEY`; workflow memetakan `SUPABASE_SERVICE_ROLE_KEY` ke nama environment internal tersebut.

## Opsional Runtime

Nama berikut diperlukan jika fitur terkait diaktifkan di environment aplikasi, tetapi tidak dipanggil langsung oleh workflow aktif:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Supabase Dashboard Security

- [ ] Supabase Dashboard > Authentication > Policies > enable “Leaked password protection” (checks new passwords against HaveIBeenPwned). Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Notes

- These values are required for end-to-end and deployment verification steps.
- The CI workflow validates that each value is present before running E2E tests.

## Staging-only integration secrets (required before CI can pass)

The GitHub Actions staging environment must define the following **staging-only** secrets. Do not point them at the production Supabase project or production user accounts.

- STAGING_E2E_URL
- STAGING_SUPABASE_URL
- STAGING_SUPABASE_SERVICE_ROLE_KEY
- STAGING_SUPABASE_ANON_KEY
- STAGING_RLS_TEST_USER_A_TOKEN
- STAGING_RLS_TEST_USER_A_ID
- STAGING_RLS_TEST_USER_B_ID
- STAGING_RLS_TEST_ADVISOR_TOKEN
- STAGING_RLS_TEST_ADVISOR_ID
- STAGING_RLS_TEST_ASSIGNED_CLIENT_ID
- STAGING_RLS_TEST_UNASSIGNED_CLIENT_ID

Configure these under **Settings → Environments → staging → Environment secrets**. Use synthetic test users and records in an isolated staging database. The CI workflow rejects the production Supabase project ref `ejiufnrqvkvqzxroustb` for these tests. Do not copy production credentials into staging.

The integration workflow intentionally fails closed when any required staging secret is absent. Keep production deployment credentials (`VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, and production Supabase credentials) separate from staging integration credentials.
