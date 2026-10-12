# Database Migration Policy

**Status:** Mandatory engineering policy  
**Scope:** Every schema, RLS, database function, function ACL/grant, trigger, index, and other persistent database change for KBAI Terminal.

## Non-negotiable rules

1. Read-only inspection MUST use SQL/execute_sql, never apply_migration. Inspection queries must not create migration-ledger entries.
2. Every schema/RLS/function-ACL change MUST first land in git as `supabase/migrations/<version>_<snake_name>.sql`, pass replay on an empty local DB, then be applied to staging, then to production with human approval.
3. Emergency production-first changes are allowed only with a same-day follow-up PR that adds the file with the SAME version and verbatim statements.
4. Migration names must be descriptive; UUID names and duplicate names are forbidden.
5. Never rewrite, rename, or delete an already-applied migration version. Reconcile historical drift with forward-only, evidence-backed changes and human review.
6. Never expose credentials, access tokens, service-role keys, or secret values in commits, logs, or reports.

## Required workflow

1. **Git first:** Create a descriptive migration file with a unique timestamp/version and snake_case name. Review the SQL and its security implications.
2. **Local replay:** Start a disposable local Supabase stack and replay the complete migration history against an empty local database. Record the exact command and result. If replay fails, stop and document the first failing version and statement; do not silently edit historical statements merely to make replay pass.
3. **Staging:** Apply the reviewed migration to staging only after local replay passes. Verify schema, policies, grants, function ownership/search path, and relevant behavior.
4. **Human approval:** Obtain explicit approval for the specific production change. Approval must identify the migration(s), expected effects, backup/restore readiness, and rollback or forward-recovery plan.
5. **Production:** Apply only the approved migration through the controlled deployment path. Never use production as a test environment or for read-only inspection through migration APIs.
6. **Drift check:** Run the database drift gate after application and verify git migration history and the remote ledger agree. Preserve run URLs and sanitized evidence in the PR.

## Pull request requirements

Every PR that touches database behavior must complete the database-change checklist in the PR template. Include replay evidence, staging status, the production approval link (before production application), and rollback SQL or a clear explanation of why rollback is not safe and what forward recovery is planned.

## Emergency exception

An emergency production-first change still requires explicit human authorization. A same-day follow-up PR must add the migration file with the exact same version and verbatim statements that were applied. The PR must document the incident, approver, evidence, and follow-up verification. This exception is not permission for agents to mutate production autonomously.

## Enforcement

Repository instructions and CODEOWNERS are the baseline controls. CI should enforce git-first migration conventions and drift checks where feasible. Branch protection and required-review settings are repository-owner actions and must be configured separately; a CODEOWNERS file alone does not enforce approval unless repository rules require it.
