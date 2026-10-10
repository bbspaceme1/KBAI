# KBAI Terminal — Master Product & Company Operating System

**Document status:** Product guardrails / single source of truth  
**Version:** 1.0 (consolidated from prior KBAI product decisions)  
**Last consolidated:** 2026-10-10  
**Company:** PT Artha Rakyat Sejahtera Yasa  
**Product identity:** KBAI = Keluarga Besar Awas Indeks  
**Positioning:** “Market brain company”; the retail-to-institution bridge for Indonesian market intelligence.  
**Product slogan:** “Tumbuh dalam diam.”

This document consolidates the product decisions currently recoverable from prior discussions. It is not permission to invent new product scope. If a detail is not specified here or in an approved follow-up decision, preserve current behavior and record the uncertainty instead of guessing.

## 1. Product system

KBAI Terminal is one integrated product operating system with six layers:

1. **Market OS** — IDX market coverage, indices, benchmark comparisons, market data quality and permitted market intelligence.
2. **Portfolio OS** — user-owned portfolios, transactions, allocation, performance, benchmark comparison and review.
3. **Intelligence OS** — methodology-governed intelligence; no unrestricted public stock-picking AI.
4. **Community OS** — Telegram membership, channels/groups, announcements and community access.
5. **Company OS** — internal operations, team responsibilities, advisor/client scope, finance, product/growth, tech/AI and control.
6. **Control Plane** — identity, role, permission, ownership, scope, state, entitlement, approval, RLS and audit.

The website is the primary workspace. Telegram is an interaction, access and notification layer, not a substitute for the website.

## 2. Non-negotiable product boundaries

KBAI is a market-intelligence, portfolio-tracking and community-intelligence platform. It is not a broker, exchange, payment marketplace, or autonomous trading system.

The user remains the owner and decision-maker for their portfolio. The product may show tracking, allocation monitoring, risk/health indicators, benchmark comparisons and a **Rebalancing Review** for human consideration. Flagged allocations can be referred to the KBAI team at the user's request.

Do not add or expose the following as autonomous public functionality:

- unrestricted stock screener or autonomous stock selection;
- DCF engine or unrestricted intrinsic-value recommendation engine;
- free-form AI stock analysis, thesis scoring, or personalized buy/sell recommendations;
- AI technical-analysis recommendations or AI dividend strategies;
- autonomous portfolio construction, optimization or rebalancing;
- autonomous order placement, trading or execution.

Do not bypass these boundaries through prompts, hidden routes, API endpoints, RPCs, feature flags, Telegram commands or admin tooling. Internal staff tooling must remain within explicitly approved roles, permissions and scope.

## 3. Market OS and index rules

- Initial market focus: Indonesian listed equities (IDX/BEI).
- Market data is **end-of-day**, with a target refresh around **17:00 WIB**; do not represent it as real-time.
- Production IDX coverage must use an official or properly licensed commercial source and aim to cover the full relevant IDX universe. **No Yahoo Finance or other unofficial fallback in production.** If the approved feed is missing or stale, fail closed and show the data state instead of silently switching sources.
- Make data timestamps, source and price/return basis transparent.
- Required benchmark comparison set recorded in prior decisions: **KBAI index, IHSG, Gold/Emas, BTC and MAMI NAV**. A common Base 100 window is required for fair comparisons.
- Comparison periods: **1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX and custom**.
- KBAI Standard (Gratis) and KBAI Terminal (Berbayar) are distinct product tiers/index experiences; do not collapse them into IHSG or silently change their methodology.
- KBAI Standard's emiten assessment uses equal weighting across the included emitens. Do not introduce market-cap weighting unless a new product decision explicitly authorizes it.
- Portfolio/methodology allocation baseline: Long Investment **25%**, Super Gems **20%**, Hidden Gems **25%**, Penadah **20%**, Scalping **10%**.
- Capital clusters: **below Rp100 million**, **Rp100 million–Rp1 billion**, and **above Rp1 billion**.
- Minimum fundamental filter discussed for the relevant mid/long-term workflow: **PBV, DER, PER, EPS, ROE and Free Float >60%**. Do not silently replace ROE with ROA. FCF and intrinsic value were discussed separately and are not additions to this six-item minimum without an approved change.
- Market classes: **Scalping, Penadah, Hidden Gems, Super Gems, Long Investment**. Their use must remain methodology-governed and must not become unrestricted public stock-picking AI.

## 4. Portfolio OS

Support user-owned portfolio tracking and transparent records, including relevant buy/sell transactions, dividends, fees, deposits and withdrawals, subject to the existing product implementation and approved schema. Provide allocation, performance, risk/health indicators and benchmark comparison.

Portfolio data must be scoped to its owner, authorized administrators and explicitly assigned advisors according to the canonical authorization model. An advisor does not gain global access merely by having the advisor role.

The product can flag an allocation and allow the user to request KBAI team assistance. It must not trade, rebalance, construct or optimize a portfolio autonomously.

## 5. Plans, entitlements and monetization

Access is configuration-driven: **plan → entitlement → feature access**. Avoid hard-coded price/permission decisions and avoid creating competing billing or subscription systems.

Prices recorded in the prior product decisions:

| Plan | Price |
|---|---:|
| Day Trader | Rp5,000,000 / year |
| Swing | Rp10,000,000 / year |
| Position | Rp25,000,000 / year |
| Investor | Rp50,000,000 / year |
| Telegram Community I | Rp1,000 / day |
| Telegram Community II | Rp3,000 / day |

Product buckets: **User, Advisor, Admin**. Public users may reference permitted market data/intelligence, track their own portfolios, compare performance and manage their own account/subscription features. Paid entitlements must not unlock prohibited autonomous AI functionality.

Community subscription cashflow for Telegram I/II is recorded as paid to the treasurer/community association; general public website revenue belongs to the company. Preserve this separation in finance and audit records.

## 6. Company OS and authorization

The canonical authorization chain is:

**ACCOUNT TYPE → ROLE → PERMISSION → OWNERSHIP → SCOPE → STATE → ENTITLEMENT → APPROVAL → RLS → AUDIT**

Company OS remains inside the same KBAI application. The operating model has a 22-person organizational structure. Mission Control is an executive operating/health dashboard, not a generic CRUD console.

Canonical account-type domains recorded in prior decisions:
- USER (including public website login and Telegram-authenticated user identity);
- CUSTOMER;
- ADVISOR;
- COMMUNITY;
- MARKET_INTELLIGENCE;
- OPERATIONS;
- FINANCE;
- PRODUCT_GROWTH;
- TECH_AI;
- CONTROL.

Use the existing canonical `app_role` enum and `user_sub_roles` for application roles; do not introduce a competing `user_roles`, role enum, permission registry, billing model or subscription model as a second source of truth. Preserve existing `profiles`, `features`, `plans`, `company_subscriptions` and `advisor_clients` contracts where present; reconcile any schema mismatch against actual migrations and schema before changing it. The recorded existing annual plan identifier includes `kbai_annual` at Rp25 million; do not infer that it replaces the tier/pricing table above.

Security invariants:
- server-side identity and permission verification;
- default-deny RLS on exposed data;
- owner/assigned-advisor/admin scoping as explicitly defined;
- service-role and secret keys never enter browser code;
- `auth.uid()` and server-verified identity for ownership checks;
- auditable privileged actions, idempotency and rate limits;
- no authorization decisions from user-editable metadata;
- fail closed on missing or expired entitlement/cohort data.

## 7. Telegram Gateway

- One bot, one webhook, one central gateway and routing layer.
- One master channel plus three discussion groups.
- Verify Telegram identity and community membership before granting group access; the master membership gate precedes access to discussion groups.
- Prefer Telegram Login/OIDC where supported.
- Website account type remains USER (Telegram identity provider), not a parallel authorization architecture.
- If a required group is missing, issue a one-use invite limited to one member, with a short expiry (target 10 minutes).
- Preserve existing Group Help behavior.
- Telegram services route to the relevant portfolio, market, intelligence, subscription, EA, community and notification capabilities, subject to each capability's permission boundary.

## 8. Emergency Fund methodology

Emergency Fund measures resilience to income loss/instability, not just a fixed number of months of expenses.

Inputs recorded in prior decisions:
- mandatory expenses;
- income type: Karyawan, Profesional, UMKM, Pengusaha, Trader, Investor, Lainnya;
- income stability;
- dependents;
- debt installments;
- liquid funds;
- physical gold.

Keep snapshots, methodology/version history, audit trail and owner/advisor/company RLS scope. Do not frame this as an unrelated external-source product; use the approved KBAI methodology.

## 9. EA Bot and future scope

EA Bot Forex & Gold via the website is a separate/future product track. Do not merge its automated trading scope into KBAI Terminal's public equity-intelligence/portfolio workflow. Existing EA Bot parameters and trading behavior must be changed only under its own approved track.

## 10. UX and operating principles

- Clean, rich, elegant UI; not dense.
- Mission Control is an executive dashboard, not CRUD-first administration.
- Product progress and production health are distinct measures.
- GitHub is the code source of truth; avoid duplicate project-management or database sources of truth.
- Product lifecycle recorded for Mission Control: **BACKLOG → PLANNED → IN PROGRESS → CODE REVIEW → QA → READY FOR DEPLOY → DEPLOYED → VERIFIED**, with **BLOCKED/CANCELLED** states.
- Track status by version/cycle and module; keep auditability of owner, QA, environment and release evidence.

## 11. Technical source-of-truth and integrations

- **GitHub** — source code, PR review, CI, migration files and release evidence.
- **Vercel** — single production web deployment target.
- **Supabase** — PostgreSQL, authentication, RLS and approved data/API functions.
- **Sentry** — error monitoring; do not send unnecessary personal or financial data.
- **PostHog** — privacy-conscious product analytics; sanitize URLs, avoid autocapture of sensitive content, and do not enable session replay by default without a reviewed privacy requirement.
- **Cloudflare** — use only for existing, required DNS/network/security functions; do not introduce a second production runtime or duplicate infrastructure without an approved architecture decision.

Use only features that are verifiably free on the account's current plan. Do not create paid resources, upgrade plans, enable paid add-ons, or rely on paid-only backups/staging. If a required control cannot be achieved on the free tier, mark the gate BLOCKED; never bypass it.

## 12. Production release gates

Production is **HOLD** until all of the following are evidenced on the exact candidate commit:

1. Migration replay succeeds from an empty local Supabase database.
2. Every local-only and remote-only migration version has an evidence-backed APPLY / SKIP / UNRESOLVED decision. Never reconstruct missing migration SQL from filenames and never use blanket migration repair.
3. Behavioral RLS/RBAC tests cover owner, other-user, assigned advisor, unassigned advisor, admin, RPC ownership, invalid quota values and negative authorization cases.
4. Lint, typecheck, unit tests, build, coverage gates, security/dependency checks and browser smoke tests pass or have an explicitly accepted, documented exception.
5. Production schema/history has only been read during reconciliation; no production writes until a restorable free-method backup is verified and the release is explicitly authorized.
6. Vercel environment variables use canonical names, production deployment is actually READY and serves the intended public domain; SSO/protection settings are deliberate, not accidental.
7. Sentry error capture and sanitized PostHog event ingestion are verified without exposing secrets, personal data or portfolio details.
8. A rollback plan is documented and tested for the proposed change set.
9. No feature, workflow or data source has changed outside this PRD.

## 13. Change control

This PRD defines the current product contract. Code and schema work may close implementation gaps but must not redefine product behavior. When a mismatch appears:
1. preserve production and user data;
2. document the exact mismatch and evidence;
3. implement the smallest compatible correction in a reviewed branch;
4. replay and test locally;
5. obtain an explicit product decision before changing an ambiguous requirement.

A passing build alone does not mean production-ready. Until all release gates pass, report the product as **BLOCKED / NOT PRODUCTION READY**.
