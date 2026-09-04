# Secret Rotation Policy

## Cadence

Rotate provider API keys and integration credentials at least every 90 days, and immediately when exposure is suspected. Rotate `SUPABASE_SERVICE_ROLE_KEY` immediately if it appears in logs, client bundles, commits, or support attachments; review access logs and revoke the old key.

## Procedure

1. Create the replacement credential in the provider dashboard or integration manager.
2. Store it only in the deployment secret store; never commit it or place it in `VITE_*` client variables.
3. Deploy and verify health checks, authentication, database access, and background jobs.
4. Revoke the previous credential after successful verification.
5. Record the rotation date, owner, affected environments, and verification result in the team security log.

## Provider notes

- **Supabase:** rotate service-role/database credentials from the Supabase project settings, update server-only deployment variables, verify RLS-backed flows, then revoke the old credential. Never expose service-role credentials to the browser.
- **AI providers:** create a replacement key, update server-side secrets, verify the configured provider fallback chain, then revoke the old key.
- **Sentry/PostHog:** rotate auth or ingestion keys from the provider project settings, update deployment secrets, verify event delivery, then revoke the old key.
- **Payment providers:** rotate server and webhook credentials together when required, verify signature validation and idempotency, then revoke the old credentials.

Any suspected leak requires incident review, credential revocation, affected-session review, and a client-bundle/history scan before closure.
