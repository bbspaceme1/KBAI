# KBAI Migration Reconciliation

Audit timestamp: 2026-10-11 UTC

## Disposition

Status: **UNRESOLVED / HOLD**. This document records evidence boundaries; it does not mark remote migrations applied and does not authorize production mutation.

| Evidence set                              | Result                        | Proof boundary                                                                                                                                             |
| ----------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local migration files on candidate branch | Present                       | Files under `supabase/migrations/`; candidate branch includes ETL, quota, advisor, role, provisioning, case, and Company OS migrations across PR branches. |
| Remote migration ledger                   | Not verified                  | Supabase MCP tools are unavailable in this session; direct database access is not a substitute for the project-scoped MCP ledger query.                    |
| Remote object definitions                 | Not verified                  | No live schema, function, trigger, grant, or policy comparison was possible.                                                                               |
| Clean local replay                        | Not proven on final candidate | The latest GitHub migration replay evidence belongs to earlier SHAs and cannot be mixed into a final candidate claim.                                      |
| Staging upgrade replay                    | Blocked                       | Staging database/fixtures are not available to the workflow.                                                                                               |
| Production migration                      | Not run                       | No production database or ledger was changed.                                                                                                              |

## Known candidate-side migration groups requiring review

- ETL checkpoints and fencing: `20261008100000`, `20261008110000`, `20261008120000`.
- Financial RPC ownership reconciliation: `20261002183536` through `20261002183853`.
- Advisor scope reconciliation: `20261003075330`, `20261003140000`.
- AI quota ownership/reservations: `20261010120000`, `20261011190000`.
- Role and provisioning: `20261010140000`, `20261010150000`.
- Case RLS: `20261011100000`, `20261011193000`, `20261012100000`.
- Company OS account/RBAC: PR #28 migrations `20261011120000` through `20261011120400`.

These names are an inventory, not proof of remote application or equivalence.

## Required next read-only comparison

1. Query `supabase_migrations.schema_migrations` for the exact project reference from `supabase/config.toml`.
2. Export definitions for affected tables, policies, functions, triggers, indexes, extensions, and grants.
3. Hash/compare each local migration's intended objects against the remote definitions.
4. Classify each version as matching, local-only, remote-only, duplicate, manually drifted, or unresolved.
5. Replay the exact candidate migration set on a clean local database and an isolated staging database.
6. Only after review, create forward-only corrective migrations where justified.

Safety: no `db push`, reset, migration repair, production mutation, data deletion, or manual ledger edit was performed.
