# KBAI TERMINAL — MASTER PRODUCT & COMPANY OPERATING SYSTEM
## Master PRD V1.0 · Single Source of Truth

**Baseline date:** 4 September 2026  
**Consolidated for implementation governance:** 10 October 2026  
**Company:** PT Artha Rakyat Sejahtera Yasa  
**Product identity:** KBAI = *Keluarga Besar Awas Indeks*  
**Status:** Approved product baseline; implementation and release readiness are tracked separately.

> This document consolidates previously agreed product decisions. It is a scope guardrail, not permission to invent or activate features. If code, schema, provider settings, analytics, or deployment behavior conflicts with this PRD, record the discrepancy and propose the smallest compatible correction. Do not change product behavior outside this track without explicit Product Owner approval and a versioned PRD/roadmap decision.

## 1. Product vision and positioning

KBAI Terminal is a **Market Operating System** and financial-intelligence platform for modern Indonesian investors. It connects retail portfolio intelligence with internal advisor/research capability and institutional-style operating controls. The product is not technology-first and is not a broker.

Positioning: **“The first retail-to-institution bridge platform in Indonesia.”**  
Operating idea: a “market brain company” combining permitted market data, portfolio tracking, benchmark intelligence, structured community intelligence, and advisor/company operations.

The product loop is:

**REGISTER → PORTFOLIO → RESEARCH → THESIS → DISCUSS → DECISION → TRACK → REVIEW**

AI may assist with research and structured analysis, but it is never the investment decision-maker. Human ownership, review, approval, and accountability remain explicit.

## 2. Product OS and platform boundaries

The product consists of coordinated operating layers:

1. **Market OS** — IDX equity universe, official end-of-day prices, market/issuer/fundamental information, classifications, index and benchmark comparisons.
2. **Portfolio OS** — user-owned holdings, transactions, cash, allocations, performance, risk/health views, and historical snapshots.
3. **Intelligence OS** — permitted market intelligence, structured research/thesis workflows, evidence, counterarguments, and internal analysis tools.
4. **Community OS** — structured investment discussion and community intelligence, not a generic social network.
5. **Company OS** — advisor/client operations, research, data, support, finance, product/growth, technical/AI operations, administration, approvals, and audit.
6. **Control Plane** — identity, role/permission/entitlement policy, feature controls, approval, release gates, audit, and operational visibility.
7. **Data OS** — governed data ingestion, validation, provenance, canonical models, derived datasets, APIs, and UI delivery.

The User Platform and Company Platform remain distinct surfaces inside the same KBAI application. They must reuse a canonical identity, permission, entitlement, and audit system rather than create parallel role, billing, or subscription sources of truth.

## 3. V1 core product scope

### 3.1 User Platform

- Account registration, authentication, profile, session and access management.
- Portfolio tracking: holdings, buys/sells, cash movements, transactions, allocation, and historical snapshots.
- Performance tracking using consistent time windows and documented methodology, including TWR/XIRR where supported by the validated data contract.
- Market and issuer intelligence for Indonesian listed equities.
- Watchlists and permitted company/market views.
- KBAI Index and market/benchmark comparisons.
- Structured thesis workflows: bull case, bear case, evidence, counterargument, and invalidation criteria.
- Structured community intelligence and approved community access.
- Reports and subscription/entitlement-aware access.
- Emergency Fund resilience assessment as a user-owned financial-planning tool, including versioned snapshots and auditability.

### 3.2 Company Platform

- Advisor/client scope and workflows.
- Internal research and market-intelligence workflows, including EquiSight.
- Market data and EOD pipeline operations.
- Company operations, approvals, support, audit, and control dashboards.
- Entitlements, plans, subscription lifecycle and related operational records.
- Finance and company-management workflows needed by the existing roadmap.
- Telegram community access verification and membership synchronization.
- Operational monitoring, incidents, release readiness, and data-quality visibility.

Company capabilities are role-scoped and must not leak into public self-service features merely because the underlying code or database function exists.

## 4. Market and data contract

- **Primary investment universe:** Indonesian domestic equities listed on IDX/BEI.
- **Price cadence:** end-of-day, not realtime. Target availability is approximately 17:00 WIB after the official data is available and validated.
- **Production source:** an authorized official/commercial IDX data provider and the full IDX issuer universe. Do not use Yahoo Finance scraping or an unofficial source as a production fallback.
- **Failure behavior:** if the required official provider is absent, invalid, stale, or fails validation, fail closed and show an honest unavailable/stale state. Do not silently substitute an unofficial provider.
- **Benchmark-only assets:** IHSG, Gold/Emas, BTC, and MAMI/NAV are comparison benchmarks, not assets that KBAI manages as the core domestic-equity universe.
- **Data provenance:** record source, source timestamp/fetch time, validation state, transformation/version, and audit evidence wherever relevant.
- **Pipeline:** SOURCE → RAW → STAGING → VALIDATION → CANONICAL → DERIVED → API → UI.
- **Reconciliation:** validate completeness, duplicates, stale values, corporate actions, period alignment, and calculation lineage before exposing derived results.

## 5. Index and performance methodology

### 5.1 Benchmark comparison

KBAI, IHSG, Gold, BTC, and MAMI/NAV comparisons must use a common start/end window and be normalized to **Base 100**. Show comparable total-return/performance views, relative performance and alpha where the inputs support it. Keep portfolio investment records separate from benchmark series.

Supported periods: **1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX, and custom range**, subject to validated data availability.

### 5.2 KBAI Standard and KBAI Terminal

- **KBAI Standard (Gratis):** an issuer index with equal issuer weighting/scoring as agreed for the Standard methodology. Do not substitute market-cap weighting without an approved methodology revision.
- **KBAI Terminal (Berbayar):** richer permitted intelligence and internal/team-assisted workflows, governed by entitlement. Paid access does not grant autonomous investment-decision AI.
- **IHSG:** the external market benchmark, not a replacement for either KBAI index.

The methodology, constituent universe, rebalance/reconstitution rules, missing-data handling, corporate-action treatment, and version effective dates must be explicit and auditable before a series is treated as production-grade.

### 5.3 Classification and fundamental filters

The agreed market classifications are **Scalping, Penadah, Hidden Gems, Super Gems, and Long Investment**. The recorded allocation mix is **10% / 20% / 25% / 20% / 25%** respectively. Treat these as a versioned/configurable classification/allocation policy, not as the equal issuer weights of KBAI Standard.

The minimum fundamental-filter discussion includes **PBV, DER, PER, EPS, ROE, and Free Float >60%**. FCF and intrinsic-value methodology require an explicit documented calculation contract before they become authoritative production filters. Do not silently change ROE to ROA or infer an approved intrinsic-value formula.

Capital clusters used in analysis: **below Rp100 million; Rp100 million–Rp1 billion; above Rp1 billion**.

## 6. AI and investment-decision boundaries

AI is a supporting intelligence layer. Approved pattern: **DATA → AI → STRUCTURED ANALYSIS → HUMAN REVIEW/APPROVAL**.

Public users must not receive autonomous:
- stock screening/selection AI;
- DCF or intrinsic-value engine as self-service recommendation;
- technical-analysis or dividend-strategy recommendations;
- portfolio construction or optimization;
- free-form personalized investment recommendations;
- autonomous trading, rebalancing, or execution.

Internal tools may support research, evidence synthesis, risk review, and structured analysis within approved Company roles. They must enforce server-side authorization and audit, and must not send AI output to production or user-facing recommendations without human review/approval. A user's portfolio remains user-owned; flagged allocations can lead the user to request help from the KBAI team, not trigger autonomous changes.

## 7. Identity, RBAC, entitlement, and data access

Authorization follows this chain:

**ACCOUNT TYPE → ROLE → PERMISSION → OWNERSHIP → SCOPE → STATE → ENTITLEMENT → APPROVAL → RLS → AUDIT**

Account categories agreed for Company OS:
- USER (including Umum Login and Telegram-authenticated users);
- CUSTOMER;
- ADVISOR;
- COMMUNITY;
- MARKET_INTELLIGENCE;
- OPERATIONS;
- FINANCE;
- PRODUCT_GROWTH;
- TECH_AI;
- CONTROL.

The existing canonical role vocabulary includes admin, user, super_admin, advisor, portfolio_advisor, equity_analyst, research_analyst, data_analyst, customer_support, engineer, and ai_agent. Reuse canonical tables and existing authorization primitives; do not add a second role/billing/subscription system. profiles, user_sub_roles, features, plans, company_subscriptions, and advisor_clients are the established implementation vocabulary where present in the current schema.

Security requirements:
- Default-deny RLS and least privilege.
- Enforce authorization in server/API code and RLS, not only in UI.
- Users see their own private portfolio/financial records.
- Advisors see only clients explicitly assigned to them.
- Admin/internal privileges require the proper canonical role and scope.
- Sensitive SECURITY DEFINER functions require an explicit caller/ownership check, fixed search path, minimal grants, and behavioral negative tests.
- Record approvals, state transitions, privileged actions, and important data changes in audit trails.
- Do not expose service-role credentials to browsers or general users.
- Tests must prove that unauthorized access is denied, not merely that a query returned an error.

## 8. Company roles and governance

The operating model separates **User, Advisor, and Admin** surfaces, while internal functions cover research, portfolio/advisor management, data, operations, finance, sales/product growth, support, technical/AI, and control/audit.

The Product Owner controls scope and priorities. Implementation agents may audit, propose, implement within approved scope, and open PRs; they may not redefine product behavior. Changes flow through:

**PRD → Epic/Feature → Task/Issue → PR → CI/QA → Review/Approval → Deployment → Smoke Test → Monitoring**

Mission Control is an executive/operational dashboard, not an unrestricted CRUD surface. Product scope, entitlement changes, production migrations, provider changes, and deployment policy must be auditable.

## 9. Commercial model and entitlements

Plan → entitlement is the source of access decisions. Plan labels and prices are configuration, not hardcoded business logic.

Recorded commercial baseline:
- Day Trader: **Rp5,000,000/year**
- Swing Trader: **Rp10,000,000/year**
- Position Trader: **Rp25,000,000/year**
- Investor: **Rp50,000,000/year**
- Telegram I: **Rp1,000/day**
- Telegram II: **Rp3,000/day**
- KBAI Standard: Gratis
- KBAI Terminal: Berbayar

Community Telegram I/II cashflow is handled according to the agreed community/treasurer arrangement; general public access is website-only; advisor/internal tooling belongs to EquiSight/Company Platform. Preserve the agreed boundaries and do not infer new plans, prices, payment flows, or entitlement semantics without approval.

## 10. Telegram community access

The agreed structure is one master channel plus three discussion groups. Prefer Telegram Login/OIDC for identity. Verify master-channel membership before group access. If a group is missing, use a one-use invite with member_limit=1 and a short expiry (target 10 minutes). The website account category is user (telegram). Use one bot, one webhook, one central gateway, and explicit routing; keep chat/member mappings and bot admin rights synchronized. Community access does not bypass KBAI identity, entitlement, scope, or audit controls.

## 11. Emergency Fund

The KBAI Emergency Fund methodology measures resilience to income loss/instability, not merely months of expenses. Inputs include mandatory expenses, income type (Karyawan, Profesional, UMKM, Pengusaha, Trader, Investor, Lainnya), income stability, dependents, debt installments, liquid funds, and physical gold.

Requirements: persist versioned snapshots, preserve calculation/methodology versions, audit meaningful changes, enforce owner/advisor/company scope, and apply RLS. Do not reduce the model to a generic months-of-expenses calculator or change its methodology without a PRD decision.

## 12. Platform architecture and delivery

Approved operating stack includes:
- GitHub as source control, review, issue/PR, and CI record;
- React/TypeScript/Vite and the existing TanStack application structure;
- Supabase Auth/Postgres/RLS and server-side data functions;
- Vercel as the single production deployment target;
- Cloudflare only where an explicitly configured, needed free-tier service is established;
- Sentry for error monitoring and PostHog for privacy-conscious product analytics when correctly connected/configured.

Do not add an alternative production hosting/database stack or introduce new paid services. Keep production behavior stable while a change is being tested in an isolated local environment or approved free staging environment.

### Free-tier-only operating rule

Use available free-tier capabilities first and **never enable, provision, upgrade to, or depend on a paid feature/service** for this work. Before any resource creation, branch/staging operation, connector, observability product, data provider, or deployment action that could incur cost, inspect the plan/cost and stop if it could require payment. Never accept a paid upgrade automatically. Do not create a paid Supabase staging project; use local Supabase replay and other verified free options first. Existing subscriptions or paid entitlements are not permission to incur new charges.

## 13. Roadmap and release discipline

The existing roadmap spans:
- **V1 — Foundation:** identity, core data contracts, portfolio, index/benchmark foundations, security, and deployment/release discipline.
- **V2 — Market and Portfolio:** validated IDX EOD data, portfolio performance, index/benchmark comparison, reporting.
- **V3 — Intelligence and Community:** structured research/thesis, permitted intelligence, and community workflows.
- **V4 — Company OS:** advisor/client, operations, finance, entitlement, approval, audit, and control-plane workflows.
- **V5 — Expansion:** future EA Bot Forex/Gold integration, APIs, and broader multi-asset/community expansion only when separately approved and supported by the roadmap.

Roadmap labels do not automatically authorize implementation. Future capabilities stay gated until their dependencies, data contracts, security boundaries, licensing, economics, and PRD decisions are approved.

## 14. Release gates — production is not declared ready until all pass

1. Master PRD and current implementation scope are aligned.
2. Local replay of all migrations from an empty database passes.
3. Migration history and remote schema are reconciled from evidence; no blind db push, applied-history rewrite, or guessed SKIP/APPLY decision.
4. Security-sensitive RPCs, role claims, RLS and grants are reviewed and behavior-tested with owner, unrelated user, assigned advisor, unassigned advisor, and admin identities.
5. Unit/type/lint/build checks pass and meaningful coverage reaches the agreed minimum of **60%**, without inflating coverage or hiding skipped tests.
6. Browser smoke/E2E and core user journeys pass in an isolated environment.
7. Official IDX provider, data freshness, source provenance, and failure modes are verified.
8. Auth, entitlement, payment lifecycle where in scope, Telegram membership, Emergency Fund and Company OS workflows are integration-tested.
9. Dependencies and security advisories are remediated or explicitly risk-accepted by the Product Owner.
10. Vercel deployment is READY, maps to the approved commit, uses correct public/server environment variables, and is verified by domain HTTP smoke tests.
11. Sentry/error monitoring and PostHog analytics are verified without exposing secrets or capturing sensitive URL/query data; Cloudflare is only marked integrated if the relevant zone/service is actually configured.
12. A rollback/restore plan, data impact analysis, release owner, and post-deploy monitoring plan are documented.
13. Production deployment and production migrations receive explicit release approval. Until then, production remains on hold.

## 15. Current audit status (10 October 2026)

This PRD is the scope authority; it does not imply implementation completion.

- GitHub PR #26 remains a draft and must not be merged merely because some checks pass.
- The free local Supabase migration replay has completed successfully in CI, but fixture setup failed because a legacy role-claim trigger references raw_app_meta_data on the wrong trigger row. RLS behavior tests and browser smoke tests therefore remain blocked pending the forward-only trigger correction and a successful rerun.
- Supabase production is healthy, but local migration files and remote migration ledger/schema remain divergent. No production migration or ledger repair is authorized by this document.
- Vercel Hobby project is not currently verified as production-live; the latest deployment was building with no production target, and SSO protection is enabled.
- Cloudflare authentication works, but the connected account currently shows no zones, Workers, or Pages projects for KBAI. Do not claim a Cloudflare production integration until configured and verified.
- PostHog is connected to a project named “Default project”; the application-side configuration and received events still need end-to-end verification.
- A Sentry connector/tool is not available in the current execution environment; integration state cannot be asserted until access is connected and verified.
- No paid staging project or paid feature should be created to clear these blockers.

## 16. Change-control rule

Every proposed implementation change must state:
1. which approved PRD requirement it implements;
2. whether it changes user-visible behavior or data semantics;
3. which schema/API/entitlement/security contracts it affects;
4. how it is tested and rolled back;
5. whether it uses only free-tier resources.

If no approved PRD requirement supports the change, do not implement it. Raise a scoped proposal for Product Owner approval instead.
