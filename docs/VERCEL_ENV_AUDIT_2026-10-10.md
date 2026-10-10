# Vercel Environment Variable Security Audit — 2026-10-10

Project: `kbaiterminal` (`prj_CE5uqT2B3WAtHYZsXsNMz7TqFESA`), team `bb-space-s-projects`.

## Actions performed

- Added canonical browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production, Preview, and Development. The publishable key is intended for browser use; no service-role/secret key is used for this setting.
- Converted the following Vercel variables from `encrypted` to `sensitive` without reading or printing their values: `SUPABASE_SECRET_KEY_3`, `SUPABASE_SECRET_KEY_2_2`, `SUPABASE_SECRET_KEY_2`, `TELEGRAM_BOT_TOKEN`, `JWT`, `JWT_2`, and `VERCEL_PERSONAL_ACCESS_TOKEN`.
- Verified the four Supabase secret-key variants, `TELEGRAM_BOT_TOKEN`, `JWT`, `JWT_2`, and `VERCEL_PERSONAL_ACCESS_TOKEN` are now `sensitive`; their Vercel security issue flags cleared. `SUPABASE_SECRET_KEY` was already `sensitive`.
- Did not delete duplicated variables or rotate any token. A suffix in a variable name is not sufficient evidence that it is unused, and no evidence was found that a credential had been exposed publicly.

## Code/workflow references verified

- Browser Supabase client reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`; it retains a legacy `NEXT_PUBLIC_*` fallback.
- Server-side Supabase client reads `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`), and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is used only by the server client and bypasses RLS.
- Telegram verification code reads `TELEGRAM_BOT_TOKEN` from server-side `process.env`.
- GitHub CI/deploy workflows use `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. The integration/E2E workflow is being changed to require distinct `STAGING_*` secrets rather than reusing production-named secrets.

## Remaining findings

- `SENTRY_AUTH_TOKEN` is the only remaining variable currently marked `readable-secret`. Vercel rejected changing its type because it is an integration-managed environment variable. Do not delete or overwrite it through the project environment-variable API; review the Sentry/Vercel integration owner and rotate/reconnect through the integration if access review indicates exposure.
- `JWT` and `JWT_2` were changed to `sensitive`, but their consumers are not yet proven from the repository search surface. Do not rotate them until their purpose is identified; if they are active signing secrets, coordinate a controlled rotation with session/token invalidation.
- Other duplicated `SUPABASE_URL_*` and `SUPABASE_PUBLISHABLE_KEY_*` entries remain. Their source/consumers must be mapped before deletion.
- No values were displayed in this report. Environment variable values must never be copied into issues, commits, or chat.

## Safe follow-up

1. Review the Vercel integration-managed Sentry token and project/team access.
2. Map every remaining environment variable against runtime source, build config, and workflow references.
3. Confirm whether `JWT`/`JWT_2` and suffixed Supabase variables are used by the app or injected by integrations.
4. Rotate only credentials confirmed exposed or accessible to unintended actors; validate production and staging after each rotation.
5. Delete redundant variables only after a clean reference search and a verified deployment using the canonical replacement.
