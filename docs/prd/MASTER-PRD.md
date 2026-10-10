# KBAI TERMINAL — MASTER PRODUCT REQUIREMENTS DOCUMENT
**Document status:** Consolidated master baseline / source of truth  
**Version:** 1.0 (consolidated from approved KBAI discussions; 10 October 2026)  
**Product:** KBAI Terminal — Keluarga Besar Awas Indeks  
**Company:** PT Artha Rakyat Sejahtera Yasa  
**Repository:** `bbspaceme1/KBAI`  
**Governance:** This document is the controlling product boundary. Implementation must follow it; code, database, vendor defaults, or an agent proposal do not override it.

## 1. Product vision and positioning

KBAI Terminal is a **market-intelligence operating system** and financial-intelligence infrastructure that bridges retail investors and institutional-quality research in Indonesia. It combines market context, portfolio intelligence, community-derived investment intelligence, and internal company operations in one governed platform. It is not technology-first and is not a broker or autonomous investment decision-maker.

Positioning shorthand: **“market brain company”** and “the first retail-to-institution bridge platform in Indonesia” (positioning statement, not a verified market-share claim). Product bundle: **Personal Fund Manager + Market Intelligence Infrastructure + Community Investment Intelligence**. Product inspiration includes the information density and workflow value of a Bloomberg-style terminal, adapted to Indonesian retail-to-institution use cases. Brand phrase: **“Tumbuh dalam diam.”**

Core principles:
- Intelligence before action; data before opinion.
- Human owns the investment decision; AI assists within explicit, bounded workflows.
- Process and evidence over prediction.
- Portfolio ownership stays with the user.
- Community is a source of structured intelligence, not an unrestricted social network.
- One canonical source of truth for roles, entitlements, market data, methodology, and audit.
- Clean, rich, elegant UI; avoid dense screens that bury decisions.
- No product functionality may be added or changed outside this PRD track without an approved, versioned change.

## 2. Product boundary

### In scope
- Indonesian Stock Exchange (IDX/BEI) equities as KBAI's primary managed research universe.
- Market reference data, EOD market context, fundamentals, performance comparisons and a versioned KBAI Index methodology.
- User-owned portfolio tracking, portfolio performance and risk/health intelligence.
- Watchlists, investment thesis, evidence, counterarguments, research workflow and structured community intelligence.
- Advisor-facing portfolio intelligence and the internal EquiSight research workspace.
- Paid/free entitlements, account management, access control, audit, privacy and company operations inside the same KBAI application.
- Telegram-based community access verification and controlled membership/invite flows.
- Emergency Fund resilience assessment using the approved KBAI methodology.
- Internal mission/control plane to monitor product, data, delivery, quality and operations.

### Explicit exclusions / hard guardrails
- No autonomous stock screening/selection AI or custom stock screener exposed to public users unless separately approved.
- No public AI-generated stock-specific thesis, issuer scoring or free-form analysis/recommendation engine. User-authored thesis, evidence and counterargument workflows remain in scope.
- No free-form AI investment recommendations, autonomous portfolio construction or optimization, autonomous rebalancing, or AI dividend/technical-analysis recommendation engine.
- No autonomous trading, broker execution, exchange, or trade-routing feature.
- No DCF/intrinsic-value engine as an unapproved autonomous product capability.
- No fundraising/VC platform, generic social network, education marketplace, or unrelated AI coding product.
- Public users may view permitted market intelligence, track their own portfolio, compare performance, and manage subscription/account features. A flagged allocation remains user-owned; the user must request KBAI-team assistance rather than triggering an autonomous portfolio action.
- Internal analysis, staff-only scoring, private notes, or staff tools must never leak to public/customer UI or API responses.
- No unofficial Yahoo Finance scraping or silent fallback in production IDX data paths.
- No paid vendor feature, paid environment, or usage tier may be enabled by implementation work. Use available free-tier capabilities only; if a required control cannot be delivered for free, document it as a blocker rather than upgrading or activating billing.

## 3. Product OS architecture

The product is one application with six connected layers and a control plane:

1. **Market OS** — IDX universe, licensed/official market data, EOD pipeline, corporate/fundamental data, benchmarks, market history and data quality.
2. **Portfolio OS** — user-owned holdings, transactions, cash, performance, snapshots, alerts, portfolio health and risk context.
3. **Intelligence OS** — research evidence, thesis/counter-thesis, fundamental filters, approved KBAI Index methodologies and bounded AI assistance.
4. **Community OS** — Telegram-linked access, member contributions and structured community investment intelligence.
5. **Company OS** — internal teams, assignments, permissions, approvals, entitlements, audit, compliance, finance and operations.
6. **Control Plane / Mission Control** — executive-level status of product requirements, delivery, CI, database parity, data freshness, incidents, deployment and release readiness. It is an operational dashboard, not a CRUD dump.

Cross-layer shared services: identity, RBAC/RLS, entitlement evaluation, audit trail, market data contracts, observability, testing and governance.

## 4. Roadmap and delivery order

- **V1 — Foundation:** identity/session, roles and access, user-owned portfolio, IDX equities and watchlist, reliable deployment, audit, privacy and quality gates.
- **V2 — Intelligence:** portfolio performance/health, research thesis and evidence, fundamental context, versioned KBAI Index and permitted AI assistance.
- **V3 — Community:** Telegram identity and membership verification, structured community intelligence, community governance and access entitlements.
- **V4 — Ecosystem:** advisor/EquiSight workflows, expanded market/portfolio intelligence, and future EA Bot integration only where separately approved.
- **V5 — Market + Corporate OS:** internal Company OS, finance/operations, enterprise controls and unified Mission Control.

Roadmap order does not authorize implementation that breaches the exclusions above. Existing code does not prove a roadmap item is production-ready.

## 5. Market data and IDX contract

- Production equities universe: **all IDX/BEI listed equities** within the applicable official/commercial data license.
- Target refresh: end-of-day, target approximately **17:00 WIB**; not a realtime product.
- Use official IDX or properly licensed commercial EOD sources. Source, licensing rights, update time, coverage and data quality must be observable.
- No Yahoo Finance/unofficial scraping as production source or fallback. If the approved source is unavailable, preserve last known data with an explicit stale/data-delayed state and alert; do not silently substitute another source.
- Each dataset must record provenance, source timestamp, ingestion timestamp, quality status and pipeline outcome.
- Corporate actions, ticker changes, missing values, duplicate records and late data need explicit handling and test coverage.
- Benchmarks for performance comparison: **IHSG, Gold/Emas, BTC and MAMI/NAV**. These are comparison benchmarks, not assets in KBAI's managed Indonesian equity universe.
- Base-100 comparison periods: 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX and custom.
- Capital clusters: under Rp100 million; Rp100 million–Rp1 billion; above Rp1 billion.
- Market-data providers and licenses are release dependencies. Never represent an unverified feed as official or licensed.

## 6. KBAI Index and research methodology

### KBAI Standard (Gratis)
- Public/free benchmark concept: a transparent **equal-weight scoring approach per eligible issuer/emiten**, so no single issuer's market capitalization silently dominates the result.
- Publish methodology, eligible universe, score definitions, normalization, data date, exclusions, missing-data handling, rebalance timing and version.
- KBAI Standard must be distinguishable from IHSG and from paid KBAI Terminal intelligence.
- The exact mathematical formula, eligibility thresholds and rebalance rules must be formally versioned and tested before claiming a production-grade investable index. Do not invent or change them in code without an approved methodology version.

### KBAI Terminal (Berbayar)
- Adds the paid intelligence/workflow layer and richer permitted analysis; it must not become an autonomous stock-selection or portfolio-action AI.
- Any score or classification exposed to customers must have a documented definition, data lineage and entitlement.

### Research classifications and proposed allocation model
Product research buckets discussed: **Scalping / Penadah / Hidden Gems / Super Gems / Long Investment**, with allocation concept **10% / 20% / 25% / 20% / 25%** respectively. This is a methodology/product configuration to be documented and approved; it is not permission for automated trading or autonomous portfolio construction. Public-facing behavior must stay inside the human-decision boundary.

### Minimum fundamental filter
The discussed minimum filter includes **PBV, DER, PER, EPS, ROE, and Free Float >60%**. ROE is intentional (not ROA). Explain each measure and its limitations; never imply that passing these filters is a guaranteed buy signal. FCF/PCF and intrinsic-value calculations require separate explicit methodology approval before becoming product logic.

### Portfolio-return and methodology requirements
Portfolio performance must support **TWR (time-weighted return)** for comparing performance independently of the timing/size of external cash flows, and **XIRR (money-weighted return)** where the user's dated cash flows matter. Base-100 benchmark comparisons must use a common start window and clearly disclose data gaps. The existing directional value/cost calculation is provisional and must not be labelled as TWR or XIRR; it is affected by deposits/withdrawals. Any TWR/XIRR implementation or index-rule change must be versioned, tested against historical examples, compared with the prior methodology and accompanied by migration notes rather than silently replacing a metric.

## 7. Portfolio and advisor experience

- Portfolio data is owned by the authenticated user.
- User can track holdings, transactions, cash, performance, history/snapshots, benchmarks and approved portfolio-health signals.
- Data isolation is enforced at database/RLS and server-function layers, not only by hiding UI elements.
- Advisor may access only clients explicitly assigned to that advisor; admin access is governed and audited.
- An advisor must not see unrelated users' holdings, snapshots, transactions, notes or personal data.
- Any flagged allocation or portfolio issue is surfaced as information. The user may request KBAI-team assistance; no autonomous modification/rebalancing occurs.
- Internal EquiSight workspace is staff/advisor-only, and its analysis must not leak to public/customer endpoints.

## 8. AI boundaries and quota

- AI is assistive, contextual, evidence-aware and bounded by role, entitlement, quotas and audit.
- No public autonomous stock selection, screening, DCF engine, technical-analysis recommendations, dividend strategy, portfolio construction/optimization, rebalancing or trading.
- AI quota must be atomic, concurrency-safe, caller-bound and reject invalid/non-positive token amounts.
- An authenticated user must not consume quota for another user by passing a different user ID. Prefer deriving caller identity from verified session context; service-side overrides require explicit trusted authorization.
- Do not expose service-role keys to browser code.
- Provider failures must be handled safely; fallback must not change the permitted product capability or silently bypass quota/security.

## 9. Account, role, permission and scope model

Canonical chain:
**ACCOUNT TYPE → ROLE → PERMISSION → OWNERSHIP → SCOPE → STATE → ENTITLEMENT → APPROVAL → RLS → AUDIT.**

Account types discussed:
- USER (including Umum Login and Telegram-authenticated user; Telegram is an identity provider under USER, not a separate authorization system)
- CUSTOMER
- ADVISOR
- COMMUNITY
- MARKET_INTELLIGENCE
- OPERATIONS
- FINANCE
- PRODUCT_GROWTH
- TECH_AI
- CONTROL

Reuse canonical existing structures and values where compatible; do not create parallel role/billing/subscription systems. Existing role vocabulary discussed: `admin`, `user`, `advisor`, `super_admin`, `portfolio_advisor`, `equity_analyst`, `research_analyst`, `data_analyst`, `customer_support`, `engineer`, `ai_agent`. Canonical role source and schema must be verified against the actual database before migrations. Known domain tables/concepts include `profiles`, `user_sub_roles`, `features`, `plans`, `company_subscriptions`, and `advisor_clients`; do not assume every table is already deployed.

Security rules:
- Default-deny RLS; explicitly grant the minimum necessary access.
- Every policy must be checked against owner, assigned advisor, admin, service role, and anonymous callers as applicable.
- Use session-derived actor identity; never trust actor IDs or role claims supplied by a client.
- Sensitive `SECURITY DEFINER` functions require a fixed `search_path`, least-privilege EXECUTE grants and caller/ownership checks.
- Keep approval separation-of-duties: creator cannot approve their own request.
- Audit log must be append-only to ordinary users; audit deletion is prohibited through application permissions.
- Company Operations state transition: `draft → review → approved → published`.
- Permission evaluation includes authentication, permission, ownership/scope, domain, approval and state.

The organization has a discussed 22-person structure with internal responsibilities mapped to account type/sub-role; do not invent new organizational roles or expose internal staff surfaces to customers.

## 10. Entitlements and monetization

Entitlement is **plan → entitlement**. UI display alone is not authorization; server and database must enforce the entitlement. Reuse existing canonical billing/subscription structures; do not duplicate them.

Pricing discussed as current product model:
- Day Trader: Rp5 million/year
- Swing: Rp10 million/year
- Position: Rp25 million/year
- Investor: Rp50 million/year
- Telegram Community I: Rp1,000/day
- Telegram Community II: Rp3,000/day
- KBAI Standard: Gratis
- KBAI Terminal: Berbayar

The existing `kbai_annual` plan was previously referenced at Rp25 million; verify its intended mapping before altering plan/price data. Prices and payment flows must not be changed by an agent without an approved pricing decision. Telegram I/II community revenue is paid to the association/treasurer cashflow; general public customers use the PT website; advisor/EquiSight is internal. Do not create or switch payment providers without an approved requirement.

## 11. Telegram Gateway

- Architecture: one master channel + three discussion groups, one bot, one webhook, central gateway and deterministic routing.
- Telegram Login/OIDC is preferred.
- Master-channel verification is required before discussion-group access.
- Missing group membership may be served through a one-use invite with member limit 1 and a short expiry (target around 10 minutes).
- Website identity maps to the canonical USER account with Telegram identity attached; no parallel authorization truth.
- Store chat/group identifiers and membership/verification states with least-privilege RLS and audit.
- Bot admin rights and configured Telegram chat records are deployment prerequisites.
- Failure or revoked membership must fail closed and must not leak reusable invite links.

## 12. Emergency Fund

KBAI Emergency Fund measures resilience to income loss/instability, not merely a fixed number of months of expenses. Required inputs:
- mandatory expenses;
- income type: Karyawan / Profesional / UMKM / Pengusaha / Trader / Investor / Lainnya;
- income stability;
- dependents;
- debt installments;
- liquid funds;
- physical gold.

Requirements: explain the result in context, version the methodology, preserve snapshots/history, log changes, enforce owner/advisor/company scope, and use default-deny RLS. Do not replace the KBAI method with a generic external-source formula without explicit approval. The methodology must not imply certainty or replace professional financial advice.

## 13. Company OS and governance

- Company OS remains inside the same KBAI application and serves the discussed 22-person organization.
- It includes operations, finance, product/growth, community, market intelligence, tech/AI and control functions under governed permissions.
- Mission Control is an executive/control dashboard, not a generic CRUD console.
- Assignment, approvals, state transitions, entitlement changes, data exports/deletion and staff access require audit.
- User data ownership, advisor scope and internal-vs-public boundaries apply consistently.
- Legal/company reference: PT Artha Rakyat Sejahtera Yasa. This PRD is product/technical scope, not a substitute for legal/regulatory review.

## 14. Observability, deployment and free-tier policy

Target operational toolchain:
- **GitHub:** source of truth, reviewed PRs, branch protection where available for free, CI, migration checks and audit trail.
- **Supabase:** Auth/Postgres/RLS, migrations, database advisors and logs within the available free allowance.
- **Vercel:** the single production hosting target; previews/builds and runtime checks only within the available free allowance.
- **Cloudflare:** DNS/security/networking only where already available on a free tier and compatible with the current architecture.
- **Sentry:** error capture/triage within the currently available free allowance, with no secrets or sensitive portfolio data in events.
- **PostHog:** privacy-conscious product analytics within the free allowance; disable automatic capture of raw URLs/query strings where they may contain private data; use explicit sanitized events.
- Integrations must be truthful: a connector login is not proof that a product project is connected, telemetry is flowing, or write access exists.
- Keep secrets server-side, scope access least-privilege, and do not print secret values into logs or reports.
- Do not activate paid plans, paid add-ons, paid staging, paid monitoring, or billable usage. When free-tier limits block a necessary control, keep the release blocked and document the limitation rather than spending money.
- No tool may change vendor settings, DNS, access protection, database schema or production deployment merely to make a dashboard green without review and rollback plan.

## 15. Testing and production acceptance gates

Production readiness is not a percentage of code written; it requires evidence. All gates must pass:
1. Master PRD and feature requirements mapped to issues/tests.
2. Type-check, lint, unit tests, production build and security/static checks pass.
3. Meaningful test coverage target ≥60%, with risk-based coverage for authorization, billing, quota, data pipelines and destructive flows.
4. Fresh local database replay of **every migration in order** succeeds from empty state.
5. Migration versions are unique; every local/remote difference is classified as APPLY, SKIP (same effect verified), or HOLD; never rename versions to force a match or repair production history blindly.
6. Remote schema/function/ACL comparison is read-only until reviewed; no production `db push`, `apply_migration`, reset, or ledger repair as a diagnostic shortcut.
7. Separate-identity behavioral tests prove owner isolation, advisor assigned/unassigned scope, admin behavior, anon denial, quota cross-user denial and invalid-token denial.
8. RLS is enabled on sensitive tables; missing policies are reviewed for default-deny side effects and legitimate workflow needs.
9. IDX pipeline uses an approved official/licensed source, covers the full intended universe and reports freshness/provenance.
10. E2E smoke tests validate public entry/login and key role journeys on an isolated local/test environment.
11. Supabase security/performance advisors are reviewed; dependency vulnerabilities have a documented disposition.
12. Vercel build/deployment is READY and target is correct; public domain reachability, auth/env configuration, headers, smoke tests and rollback are verified.
13. Sentry/analytics are connected to the correct project and privacy-safe; event/error ingestion is verified rather than assumed.
14. Rollback is written before any schema/deployment release; database rollback is forward-only where data/schema cannot safely be reversed.
15. All release evidence is recorded in the reconciliation progress document and CI artifacts.

Current known blockers must remain visible: remote migration history/schema drift; migration files whose names differ from earlier assumed paths (the actual tracked files must be reviewed by their SQL and version, never recreated from guessed names); local replay failures; quota RPC caller binding; RLS behavioral tests; coverage/dependency findings; and Vercel's previously observed non-live project state, preview-only deployment target and SSO protection. These are evidence-based blockers, not permission to make speculative production changes.

## 16. Migration and rollback policy

- Migrations are append-only and forward-only; do not rewrite history that may have run remotely.
- No production migration execution until exact SQL and remote schema are compared, local replay passes, isolated behavioral tests pass, rollback/forward-repair is documented, and the release is approved.
- Never use production as a test environment. Never create a paid staging project under this requirement.
- For every proposed migration record: purpose, affected objects, preconditions, idempotency, lock/downtime risk, data backfill, post-check, rollback/forward-repair, APPLY/SKIP/HOLD decision and evidence.
- If a migration fails locally, fix the migration chain in the feature branch and rerun from a fresh database; do not patch production to make the test pass.

## 17. Change-control contract — “No change outside PRD track”

Before changing any behavior, an agent must:
1. Identify the exact PRD section and acceptance criterion authorizing the change.
2. Describe expected behavior before and after, user/role impact and data impact.
3. Prefer the smallest additive change and reuse canonical existing models.
4. Add or update tests for intended behavior and negative cases.
5. Avoid adjacent refactors, redesigns, new business logic, provider substitutions, pricing changes or new product capabilities not required by that criterion.
6. If the PRD is ambiguous or conflicts with existing production behavior, document the conflict and stop at a proposal; do not guess.
7. Keep changes on a reviewed feature branch/PR. No direct unreviewed main changes, merge, production deploy or production migration.
8. Update this PRD only through an explicit approved decision and versioned change log. A code implementation must not silently redefine the product requirement.

### Required change record
- PRD section / requirement ID:
- Existing behavior:
- Intended behavior:
- Roles and surfaces affected:
- Security/data/migration impact:
- Tests and evidence:
- Rollback:
- Status: Proposed / Approved / Implemented / Verified

## 18. Consolidated status at this PRD version

This document consolidates product intent and guardrails; it does **not** certify the current repository or vendors as production-ready. The linked Supabase project has been inspected read-only for some schema/security facts, but complete migration parity and behavioral isolation are not proven. GitHub CI may pass while local replay or migration drift fails. Vercel currently reports a non-live project/deployment state and SSO protection on non-custom domains. Cloudflare identity is connected, but account/resource linkage to the product still needs verification. PostHog connector availability does not prove project/event linkage. Sentry connector tools were not available in this session, so Sentry access/ingestion remains unverified.

**Release status: HOLD — NOT PRODUCTION READY until every gate in §15 has evidence of PASS.**

## 19. Change log

- **v1.0 — 2026-10-10:** Consolidated prior approved KBAI product discussions into a single source of truth. No implementation behavior is authorized to change merely by creating this document.
