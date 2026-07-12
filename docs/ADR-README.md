## Architecture Decision Records (ADR) - KBAI Terminal

This directory contains architecture decisions for KBAI Terminal SaaS platform.

### Format

Each ADR is named as `ADR-NNN-short-title.md` and follows this template:

```markdown
# ADR-NNN: [Short Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]
**Date**: [YYYY-MM-DD]
**Author**: [Name]
**Stakeholders**: [Team members affected]

## Context

[Explain the issue driving this decision and why it matters to the business/product]

## Problem Statement

[What specific technical challenge are we addressing?]

## Decision

[What did we decide to do and why?]

## Rationale

[Why is this the best solution among alternatives?]

## Alternatives Considered

1. [Alternative A] - [Why rejected]
2. [Alternative B] - [Why rejected]

## Consequences

### Positive

- [Benefit 1]
- [Benefit 2]

### Negative

- [Risk/Tradeoff 1]
- [Risk/Tradeoff 2]

## Implementation Notes

- [Specific implementation detail 1]
- [Dependency or blockers]
- [Estimated effort]

## Related ADRs

- ADR-NNN: [Title]
- ADR-XXX: [Title]

## References

- [Link to PR/Issue]
- [Link to documentation]
```

---

## Existing ADRs

### ADR-001: AI Quota Management with Advisory Locks

**Status**: Accepted  
**Date**: 2026-06-05  
**Author**: KBAI Dev Team

**Context**: The AI gateway processes many concurrent requests for market analysis. Without proper quota enforcement, users could consume their monthly allowance through race conditions (TOCTOU attacks).

**Decision**: Use PostgreSQL advisory transaction locks in the `try_consume_ai_quota()` RPC function to ensure atomic quota deduction.

**Implementation**:

```sql
SELECT pg_advisory_xact_lock(hashtext(p_user::text))
```

**Consequences**:

- ✅ Prevents quota overages even under high concurrency
- ✅ Simple to implement with PostgreSQL native feature
- ⚠️ May have slight performance impact if lock contention is high (rare for per-user locks)

**References**: `supabase/migrations/20260605000000_fix_ai_quota_race_condition.sql`

---

### ADR-002: Cloudflare Workers as Primary Deployment Target

**Status**: Accepted  
**Date**: 2026-06-10  
**Author**: KBAI Infra Team

**Context**: KBAI Terminal targets Indonesian market. Cloudflare has excellent Asia-Pacific coverage with edge compute in Jakarta. Vercel Node.js runs on centralized US regions, adding latency.

**Decision**: Deploy to Cloudflare Workers (Primary) with Vercel as fallback for Node.js compatibility.

**Rationale**:

- Lower latency for Indonesian users (edge compute in APAC)
- KV storage for rate limiting and caching (no external Redis needed)
- Cost-effective at scale
- Familiar Wrangler tooling

**Alternatives**:

- AWS Lambda: Higher cost, more infrastructure overhead
- Vercel: US-based, higher latency for SEA region
- Railway: Limited edge presence in APAC

**Implementation**:

- Primary: `src/server.ts` → Cloudflare adapter via `wrangler.jsonc`
- Fallback: `api/entry.ts` → Vercel Node.js via `vercel.json`
- CI/CD: Deploy Cloudflare to staging/production based on `main` branch

**References**: `wrangler.jsonc`, `vercel.json`, `.github/workflows/ci.yml`

---

### ADR-003: Persistent Feature Flags with Database Backend

**Status**: Accepted  
**Date**: 2026-06-20  
**Author**: Product & Eng

**Context**: Early-stage SaaS needs safe feature rollouts. In-memory feature flags don't scale (different server instances see different flags), and environment variable flags require redeploys.

**Decision**: Store feature flags in Supabase PostgreSQL with 5-minute client-side cache.

**Rationale**:

- **Consistency**: All instances see same flags
- **Safety**: Can toggle features without redeploy
- **Analytics**: Database audit logs track flag changes
- **Experimentation**: Support gradual rollouts (e.g., 50% of users)

**Rollout Strategy**:

- `rollout_percentage`: 0-100, hash-based for deterministic user assignment
- `target_roles`: Restrict to specific roles (e.g., `['advisor', 'admin']`)
- `target_user_ids`: User-specific targeting for power users
- `expires_at`: Auto-disable after date

**Implementation**:

```typescript
await featureFlagManager.isEnabled("NEW_PORTFOLIO_UI", userId, userRole);
```

**References**: `src/lib/persistent-feature-flags.ts`, `supabase/migrations/20260620000000_add_feature_flags_table.sql`

---

### ADR-004: Role-Based Access Control (RBAC) via Middleware

**Status**: Accepted  
**Date**: 2026-06-12  
**Author**: Security Team

**Context**: Application has 3 user roles (Member, Advisor, Admin). Some server functions should only be accessible to specific roles.

**Decision**: Implement RBAC as middleware on server functions using `@tanstack/react-start` middleware system.

**Implementation**:

```typescript
export const updateUserTier = createServerFn()
  .middleware([authedMiddleware, requireRole("admin")])
  .handler(async ({ data }) => {
    // Only admins reach here
  });
```

**Alternatives**:

- Database-level RLS: Works but doesn't prevent function invocation
- Implicit role checks: Scattered throughout codebase, hard to audit

**Consequences**:

- ✅ Centralized security policy
- ✅ Easy to audit (grep `requireRole()`)
- ⚠️ Middleware runs before validation; must not leak data in errors

---

### ADR-005: Zod Schemas for Input Validation

**Status**: Accepted  
**Date**: 2026-06-18  
**Author**: API Team

**Context**: Server functions accept user input. Without centralized validation, bugs happen (e.g., storing negative portfolio lots).

**Decision**: Use Zod for declarative schema validation on all server functions.

**Implementation**:

```typescript
const portfolioTransactionSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{1,5}$/),
  lot: z.number().int().positive(),
  price: z.number().positive(),
});

export const addTransaction = createServerFn()
  .validator(portfolioTransactionSchema)
  .handler(async ({ data }) => {
    // data is typed and validated
  });
```

**Benefits**:

- Type safety (TypeScript inference)
- Consistent error messages
- Centralized definition
- Easy to document API contracts

**References**: `src/lib/validation.ts`

---

### ADR-006: Market Data Provider Chain

**Status**: In Progress  
**Date**: 2026-06-19  
**Author**: Data Team

**Context**: Yahoo Finance Terms of Service forbid scraping. Need reliable market data source.

**Decision**: Implement provider chain: Sectors Financial API (primary) → OpenAI (fallback) → local cache.

**Rationale**:

- Sectors Financial: Official Indonesian market data provider
- Fallback: Ensures service availability
- Cache: Reduces API calls

**Implementation**:

```typescript
const price = await getStockPrice("BBRI", {
  providers: ["sectors", "openai", "cache"],
});
```

**Status**: Pending implementation (TASK-009)

---

### ADR-007: Data Export for GDPR/UU PDP Compliance

**Status**: Accepted  
**Date**: 2026-06-20  
**Author**: Legal & Compliance

**Context**: Operating in Indonesia requires compliance with UU No. 27 Tahun 2022 (Indonesian Personal Data Protection Law) and GDPR for EU users.

**Decision**: Implement on-demand data export (JSON/CSV) and account deletion workflows.

**Features**:

- Users can export their data (transactions, holdings, AI logs, activity)
- Exports expire after 7 days (stored in Cloudflare R2/Vercel Blob)
- Account deletion anonymizes profile and soft-deletes auth record
- All deletions logged in `account_deletion_logs` for compliance audits

**Implementation**:

- `POST /api/data-export` - Initiate export
- `GET /api/data-export/:id/download` - Download file
- `POST /api/account/delete` - Delete account

**References**: `src/lib/data-privacy.functions.ts`, `supabase/migrations/20260620100000_data_export_gdpr_compliance.sql`

---

## Future ADR Candidates

These topics should be documented as decisions are made:

- **API Versioning Strategy** (TASK-021) - How to version endpoints when API changes
- **Monitoring & Alerting** (TASK-014) - External service for uptime monitoring
- **Mobile Strategy** (TASK-026) - React Native vs. Progressive Web App
- **Crypto Support** (TASK-027) - If crypto portfolio tracking is added
- **Real-time Notifications** (Future) - WebSocket strategy vs. polling
- **Caching Strategy** (Future) - Redis vs. Cloudflare KV vs. Database caching

---

## ADR Governance

### When to Write an ADR

- Significant architectural decision (affects >3 components)
- Technology choice (new framework, database, service)
- Security decision (encryption, authentication, rate limiting)
- Scalability concern (caching strategy, data partitioning)
- Breaking change to existing system

### When NOT to Write an ADR

- Minor implementation detail
- Bug fix
- Single-file refactoring
- Feature addition using existing patterns

### Review Process

1. Author creates ADR in `docs/adr/` with `Proposed` status
2. Post in GitHub Discussion or internal channel for feedback
3. Stakeholders review and comment (3-5 days typical)
4. Author updates ADR based on feedback
5. Approver (Tech Lead or Architect) changes status to `Accepted`
6. Link ADR in related PR/Issue before implementation

### Superseding ADRs

When a decision is reversed:

1. Change old ADR status to `Superseded by ADR-XXX`
2. Link new ADR
3. In new ADR, explain why the old approach doesn't work anymore

---

## Index of ADRs by Topic

### Infrastructure & Deployment

- ADR-002: Cloudflare Workers as Primary Deployment

### Data & Storage

- ADR-007: Data Export for GDPR Compliance

### Performance & Scalability

- ADR-003: Persistent Feature Flags

### Security & Access Control

- ADR-001: AI Quota Management with Advisory Locks
- ADR-004: Role-Based Access Control (RBAC)
- ADR-005: Zod Schemas for Input Validation

### Data Integration

- ADR-006: Market Data Provider Chain

---

Generated: 2026-06-20  
Last Updated: 2026-06-20
