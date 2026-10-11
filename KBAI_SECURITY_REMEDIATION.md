# KBAI Security Remediation

Audit timestamp: 2026-10-11 UTC
Candidate reference: `665e314df1fdcb40092a34fbc4c8176f99b45832`

## Current status

**HOLD.** Security Advisor and live RLS/RPC verification are not claimed because Supabase MCP authorization is unavailable in this session.

| Area                                           | Status                    | Evidence / limitation                                                                                                                               |
| ---------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS behavioral tests                           | BLOCKED                   | GitHub Integration/E2E fails because `E2E_URL` and authenticated user/advisor fixture variables are empty. Local suite has skipped real-user tests. |
| Security Advisor                               | BLOCKED                   | No active Supabase MCP tool is exposed after authorization renewal attempts.                                                                        |
| SECURITY DEFINER functions                     | NOT VERIFIED              | Must inspect exact definitions, fixed `search_path`, identity/ownership checks, and EXECUTE grants on the live project.                             |
| `case_analysis` / `case_notes` policy coverage | NOT VERIFIED              | Local branches contain corrective migrations, but remote equivalence is unproven.                                                                   |
| AI quota ownership/concurrency                 | IMPLEMENTED, NOT VERIFIED | Local code and migrations exist; live concurrency and ownership tests require an isolated database and authenticated fixtures.                      |
| Secret exposure                                | NOT VERIFIED COMPLETE     | No secrets were intentionally printed or committed; final bundle scan must run on the combined candidate.                                           |

## Required live checks

- Inspect all policies for `case_analysis`, `case_notes`, holdings, transactions, advisor clients, quota reservations, and audit tables.
- Inspect `adjust_cash_balance`, `has_role`, `try_consume_ai_quota`, and `upsert_holding_buy` definitions, volatility, `SECURITY DEFINER`, `search_path`, and role grants.
- Run anon, authenticated User A/B, assigned/unassigned advisor, and admin positive/negative tests.
- Verify leaked-password protection and auth settings without exposing secrets.
- Run Security Advisor and retain sanitized findings as an artifact.

No database security setting, role grant, RLS policy, or auth configuration was changed during this audit.
