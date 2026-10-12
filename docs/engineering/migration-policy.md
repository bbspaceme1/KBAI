# KBAI Database Migration Policy

## Purpose

This policy prevents production-first database changes from becoming undocumented migration drift. It applies to schema, RLS, functions, triggers, grants, ACLs, indexes, and data backfills.

## Required flow

1. **Git first** — create a descriptive `supabase/migrations/<version>_<snake_name>.sql` file and include the change in a reviewable pull request.
2. **Empty local replay** — run the complete migration sequence against a clean local database and retain the result in CI or the PR evidence.
3. **Staging** — apply the reviewed migration to an isolated staging database, run the relevant behavioral, RLS, and application tests, and record the schema result.
4. **Human approval** — obtain explicit approval from the release owner for production. The approval must identify the migration version, risk, backup/recovery evidence, and rollback or mitigation plan.
5. **Production** — apply forward-only migrations through the approved migration mechanism, one controlled change at a time. Verify the resulting schema, policies, grants, and application behavior after each step.
6. **Drift gate** — run the database drift check against the same commit and confirm the remote ledger and Git migration directory agree.

## Inspection versus mutation

Read-only inspection MUST use SQL/`execute_sql` or another read-only query. `apply_migration` must never be used for inspection, verification, or reconciliation because it writes to the migration ledger. Agents must not run remote `db push`, migration repair, reset, or manual ledger edits without explicit approval for the exact operation.

## Naming and emergency changes

Migration names must describe the intent in `snake_case`; UUID-only names and duplicate names are forbidden. Applied migration versions must never be renamed.

Emergency production-first changes are allowed only when the incident is recorded and a same-day follow-up pull request adds the same migration version with the verbatim statements and approval evidence. The follow-up PR must also document why the normal Git-first flow was unavailable.

## Required PR evidence

Every database PR must state whether the change affects schema, RLS, functions, triggers, grants, ACLs, indexes, or data. It must link empty-local replay, staging verification, production approval, and rollback/recovery evidence. If any item is unavailable, the PR remains blocked and must not be merged.
