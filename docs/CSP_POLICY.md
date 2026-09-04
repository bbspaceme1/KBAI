# Content Security Policy

The deployed policy currently retains `unsafe-inline` for `script-src` because TanStack Start/Vite SSR emits framework hydration and bootstrap scripts that are not currently nonce-aware in this adapter. A static nonce would not be secure because it would be reusable across responses.

Nonce migration is intentionally deferred until the SSR entry can generate a per-request nonce and pass it to every framework-generated inline script. The policy should then move to a response header with a nonce and remove `unsafe-inline` from `script-src`; do not implement a static build-time nonce.

Current defense-in-depth headers remain configured in `vercel.json`, including `frame-ancestors 'none'`, `X-Content-Type-Options`, referrer policy, HSTS, and a restricted permissions policy. Any future CSP change must verify hydration, auth callbacks, Supabase connections, and browser console violations in a deployed preview.
