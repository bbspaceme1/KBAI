# Required GitHub Actions Secrets

The following secrets must be configured in GitHub repository settings before the CI workflow can run successfully.

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
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Supabase Dashboard Security

- [ ] Supabase Dashboard > Authentication > Policies > enable “Leaked password protection” (checks new passwords against HaveIBeenPwned). Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Notes

- These values are required for end-to-end and deployment verification steps.
- The CI workflow validates that each value is present before running E2E tests.
