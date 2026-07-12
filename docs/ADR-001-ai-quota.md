# ADR 001: AI Quota Enforcement

Date: 2026-05-19

Status: Accepted

## Context

Unrestricted AI usage can lead to runaway costs. The system integrates multiple AI providers and records usage per user in `ai_usage_logs`.

## Decision

1. Enforce per-user daily and monthly token limits stored in `subscriptions`.
2. Implement atomic DB RPC `try_consume_ai_quota(user_id, tokens)` to check and reserve quota.
3. Integrate DB RPC call in the server-side AI gateway before making provider calls; fall back to application-side check if RPC fails.
4. Log all AI calls and quota reservation attempts in `ai_usage_logs`.

## Consequences

- Prevents overspend by reserving quota in DB atomically.
- Requires `ai_usage_logs` and `subscriptions` migrations and RLS policies.
- Adds slight latency for quota checks but eliminates cost risk.
