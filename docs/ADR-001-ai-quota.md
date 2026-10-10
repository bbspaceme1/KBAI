# ADR 001: AI Quota Enforcement

Date: 2026-05-19

Status: Accepted

## Context

Unrestricted AI usage can lead to runaway costs. The system integrates multiple AI providers and records usage per user in `ai_usage_logs`.

## Decision

1. Enforce per-user daily and monthly token limits stored in `subscriptions`.
2. Implement caller-bound atomic `reserve_ai_quota(user_id, tokens)` and `finalize_ai_quota_reservation(...)` RPCs; retain `try_consume_ai_quota` only as a one-shot compatibility wrapper.
3. The server-side AI gateway must reserve quota with the authenticated user's JWT before calling a provider and finalize the same row with actual usage. It must fail closed if reservation is unavailable; never fall back to a non-atomic application-side quota check.
4. Include pending reservations in concurrent quota checks, avoid double-counting by finalizing the same row, and retain a pending reservation on provider timeouts where billing is uncertain.
5. Log all AI calls and quota reservation attempts in `ai_usage_logs`.

## Consequences

- Prevents overspend by reserving quota in DB atomically.
- Requires `ai_usage_logs` and `subscriptions` migrations and RLS policies.
- Adds slight latency for quota checks but eliminates cost risk.
