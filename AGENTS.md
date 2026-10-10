# AI Agent Guidance for KBAI Terminal

**Updated: June 2026 (Post-Audit)**

## Purpose

## Product source of truth and change control

- Canonical Master PRD: `docs/prd/MASTER-PRD.md`. Read it before implementing or reviewing any product behavior, role, data source, entitlement, price, AI capability, migration or workflow.
- Do not change functionality outside an explicit PRD section and acceptance criterion. If scope is ambiguous or existing behavior conflicts with the PRD, document the discrepancy and stop at a proposal instead of guessing.
- Keep implementation on a feature branch/PR. Do not merge, promote a deployment, weaken access protection, or apply/repair production migrations as part of a diagnostic task.
- Free-tier-only constraint: do not activate paid plans, paid staging, paid add-ons or billable vendor features. If free-tier limits prevent a required control, report the blocker rather than upgrading.
- Product requirements and exclusions in the Master PRD override stale or conflicting guidance elsewhere in this file. Update this file only to maintain consistent agent guardrails; product behavior still requires an explicit approved PRD criterion.


KBAI Terminal is a production investment analytics SaaS platform targeting Indonesian stock market (IDX). This repository guides AI agents on codebase conventions, architectural boundaries, and critical guardrails.

## Product Context

- **Market:** Indonesia IDX stock market analysis
- **Users:** Retail investors (Member), professional advisors (Advisor), system admin (Admin)
- **Core Features:** EOD IDX market/index intelligence, user-owned portfolio tracking and benchmark comparison, methodology-governed intelligence, Community OS and Company OS. See `docs/prd/MASTER-PRD.md` for the authoritative scope.
- **Stage:** Follow the current product/release status in `KBAI_RECONCILIATION_PROGRESS.md`; do not infer readiness from this file.
- **Monetization:** Configuration-driven plan → entitlement. Recorded tiers: Day Trader Rp5M/year, Swing Rp10M/year, Position Rp25M/year, Investor Rp50M/year; Telegram Community I Rp1,000/day and II Rp3,000/day. Do not invent Pro/Enterprise tiers or a payment provider without an approved product decision.

## Core Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Router:** `@tanstack/react-router` with generated route tree in `src/routeTree.gen.ts`
- **Server Runtime:** `@tanstack/react-start` (Vercel as the single production target)
- **CSS:** Tailwind v4 + Radix UI components
- **Database:** Supabase PostgreSQL with RLS policies, see `src/integrations/supabase/client.server.ts`
- **AI:** Multi-provider gateway (Gemini, OpenAI, Anthropic) with quota enforcement, see `src/lib/ai-gateway.ts`
- **Observability:** Sentry (errors), PostHog (analytics), structured logging with correlation IDs
- **Testing:** Vitest (unit) + Playwright (E2E)

## Entry Points & Architecture

- `src/main.tsx` — React client bootstrap
- `src/start.ts` — TanStack Start server configuration
- `api/entry.ts` — Vercel Node.js adapter
- `src/functions/*/` — Server functions (RPC style, not REST API)
- `src/routes/` — Route components (file-based routing)
- `src/lib/` — Shared utilities, must be server-compatible

## Deployment Status

- **Production Target:** Vercel (single production target)
- Build: `vite build` → `dist/`
- Deploy: `vercel --prod`

## Authoritative Product Contract

Read `docs/prd/MASTER-PRD.md` before implementing product behavior. It supersedes conflicting legacy summaries in this file. In particular, do not build or expose an unrestricted IDX screener, DCF engine, stock-selection/recommendation AI, AI technical/dividend recommendations, autonomous portfolio construction/optimization, or automated trading/rebalancing. Use the official/licensed EOD IDX source; never fall back to Yahoo/unofficial sources in production. Keep the user in control of their portfolio and preserve the canonical Company OS authorization chain and `user_sub_roles` role source.

## Critical Guardrails & Forbidden Patterns

### ❌ NEVER DO THIS

1. **Import `supabase` client in React components** — use server functions instead
   - ❌ `import { supabase } from '@/integrations/supabase/client.browser'`
   - ✅ Call a server function that calls `supabaseAdmin`

2. **Use localStorage for state** — breaks SSR, use TanStack Query or Zustand on client
   - ❌ `localStorage.setItem('portfolio', JSON.stringify(data))`
   - ✅ `useQuery(['portfolio', userId])` with server function

3. **Hardcode domain names** — use environment variables
   - ❌ `https://app.kbai.id` in source code
   - ✅ `process.env.APP_DOMAIN || 'app.kbai.id'`

4. **Missing input validation** — ALL server functions must validate with Zod
   - ❌ `export const addTransaction = createServerFn(...handler(async (tx) => { ... }))`
   - ✅ Use `.validator(transactionSchema)` middleware

5. **Race condition on quota/billing** — use `try_consume_ai_quota` RPC which has advisory lock
   - ❌ App-side `if (usage < quota) { AI.call(); updateUsage(); }`
   - ✅ Server RPC: `await supabaseAdmin.rpc('try_consume_ai_quota', { p_user: userId, p_tokens: 5000 })`

6. **Unhandled AI provider failures** — always use provider chain with fallbacks
   - ❌ `const response = await gemini.complete(...)`
   - ✅ Use `AIGateway` which tries Gemini → OpenAI → Anthropic

7. **Forgetting RBAC middleware** — admin operations MUST use `requireRole('admin')`
   - ❌ `export const updateUserTier = createServerFn(...).handler(...)`
   - ✅ `.middleware([authedMiddleware, requireRole('admin')])  .handler(...)`

### ⚠️ WATCH OUT FOR

- **AI token counting:** Use `estimateTokens()` pre-call, but ALWAYS use actual token counts from API response
- **Feature flags:** MUST be persistent (DB-backed), not in-memory only
- **Rate limiting:** Use an atomic, security-reviewed implementation that fits the existing free-tier budget (e.g. PostgreSQL/RPC where appropriate); do not introduce paid dependencies or rely on process-local Map for production enforcement.
- **Billing calculations:** ALWAYS map highest tiers first (1M+ → enterprise, then 100K+ → pro)
- **Market data:** Official IDX/BEI or properly licensed commercial EOD source covering the intended IDX universe; never use Yahoo Finance/unofficial scraping or silent fallback in production.

## Testing Requirements (NON-NEGOTIABLE)

Every server function and `src/lib/` utility must have unit tests. Target: ≥60% coverage.

```typescript
// Example: src/lib/__tests__/billing.test.ts
it("maps IDR 1,500,000 to enterprise tier", () => {
  const { tier } = mapAmountToTier(1_500_000);
  expect(tier).toBe("enterprise");
});
```

- Run: `npm run test:run` or `npm run test:coverage`
- E2E tests in `e2e/` use real authenticated users (seeded in global setup)

## Security & Compliance Checklist

- ⏳ RLS policies, grants, and negative authorization tests must be verified against the current remote schema; never assume coverage from code alone.
- ✅ MFA enforcement for admin/advisor users (implemented in `auth-middleware.ts`)
- ✅ Server-side RBAC enforcement (use `requireRole()` for sensitive operations)
- ✅ CSP headers with `'unsafe-inline'` for React (Tailwind requires it)
- ⏳ Data export (GDPR/UU PDP) — planned TASK-019
- ⏳ Secrets rotation policy — see `docs/SECRETS_ROTATION.md` (planned)

## Audit Findings Summary (June 2026)

- **Maturity Score:** 62/100 (Pre-Scale)
- **Critical Issues Fixed:** Billing tier mapping, CI workflow duplicate, rate limiter, webhook idempotency, health endpoint
- **Active Work Items:** Test coverage, feature flag persistence, market data migration, API versioning
- **Next Priorities:** GDPR compliance, enterprise SOC2 preparation, mobile optimization

See `docs/archive/AUDIT_COMPLETION_SUMMARY.md` for detailed remediation status.

- For feature work, inspect `src/routes/`, `src/components/`, `src/features/`, and `src/lib/` first

## Notes for maintainers

- There is no root `README.md`; use `package.json`, `vercel.json`, and `src/` conventions as the canonical implementation reference
- Keep the focus on production-readiness: security headers, client/server alignment, build-time route generation, and ESM module semantics
