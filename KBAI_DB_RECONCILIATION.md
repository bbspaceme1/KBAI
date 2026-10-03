# KBAI Database Reconciliation

## Scope

This document records repository and linked Supabase evidence separately. The linked project `ejiufnrqvkvqzxroustb` received forward-only RLS and financial-RPC hardening through the Supabase MCP; no destructive data operation or reset was executed.

## Local migration inventory

- Repository migration files were inventoried from `supabase/migrations/`.
- The duplicate version `20260905130000` was found on two files.
- The advisor/schema mismatch migration was moved to the unique version `20260905130100_fix_advisor_schema_function_mismatches.sql` so local ordering is deterministic.
- The moved migration was hardened so its `SECURITY DEFINER` financial functions retain `auth.uid() = p_user_id` checks and input validation instead of overriding the ownership migration with weaker definitions.

## Remote state

The linked Supabase project was queried through MCP. Remote migration listing was permission-blocked for the first project identifier, then the linked project `ejiufnrqvkvqzxroustb` was identified. A forward RPC security migration was applied and its non-destructive ACL/search-path assertion returned success. Full schema parity and behavioral cross-user RLS testing remain unverified.

Remote evidence now verified:

- The financial RPC ACL/search-path verification migration returned `success`.
- The verification asserted explicit `search_path` and absence of anonymous/public execution grants for the inspected financial RPC overloads.
- A prior broad ownership assertion failed for `upsert_holding_buy`; therefore caller-ownership enforcement is not claimed verified for every remote function body.
- No claim is made that all local migrations, Company Operations, Emergency Fund, billing, or Telegram schema are present remotely.

| Area                    | Local desired state                                 | Remote evidence                                                              | Status              | Action                                                             |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| Migration lineage       | Unique ordered versions                             | Local duplicate check passed; remote history not fully captured              | `PARTIAL`           | Compare remote history before any further apply                    |
| Financial RPC ownership | `auth.uid()` must equal `p_user_id`                 | ACL/search_path verified; full remote body ownership not proven              | `PARTIAL`           | Inspect exact overload bodies and run authenticated negative tests |
| Financial RPC grants    | Revoke `PUBLIC`/`anon`; grant only required callers | Forward ACL assertion succeeded via MCP                                      | `VERIFIED STATIC`   | Add behavioral cross-user RPC tests                                |
| RLS                     | Owner/scope policies with negative tests            | Forward advisor/compliance policy correction applied; identities unavailable | `BLOCKED_ENV`       | Run separate-identity RLS matrix                                   |
| Company Operations      | Tables, roles, permissions, approval, audit, RLS    | Not yet reconciled                                                           | `PENDING_MIGRATION` | Compare schema and prepare additive migration                      |
| Emergency Fund          | Persistence, history, version, owner RLS            | Not yet reconciled                                                           | `PENDING_MIGRATION` | Compare schema and prepare additive migration                      |

## Financial conflict decision

The ownership-enforcing migration is the security baseline. The advisor/schema mismatch migration remains useful for schema compatibility, but it must not weaken ownership checks. Its local version is now unique and its overlapping definitions contain the same caller-ownership invariant and basic input validation.

This is a repository correction, not proof that either migration has executed remotely. Before production execution:

1. Query remote migration history.
2. Query remote function definitions and ACLs.
3. Determine whether either old duplicate version was applied.
4. If the old version is already recorded remotely, do not replay or rewrite history; prepare a new corrective migration.
5. Apply only after staging verification and approval.

## Rollback strategy

- Do not reset or squash migration history.
- Do not delete production data.
- If the unique migration has not been applied, revert the repository commit and prepare a replacement migration after schema review.
- If a corrective migration is applied, rollback must be a forward migration that restores the prior compatible function contract while preserving authorization, not a destructive down migration.

## Verification queries

Use read-only queries first:

```sql
select version, name from supabase_migrations.schema_migrations order by version;

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
       p.prosecdef, pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('upsert_holding_buy', 'upsert_holding_sell', 'adjust_cash_balance');

select routine_schema, routine_name, privilege_type, grantee
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('upsert_holding_buy', 'upsert_holding_sell', 'adjust_cash_balance');
```

Behavioral verification must use separate authenticated identities and confirm cross-user RPC calls fail.

## Evidence boundary

This file is evidence of local migration reconciliation only. It does not claim remote schema parity, migration application, RLS success, production readiness, or deployment success.
