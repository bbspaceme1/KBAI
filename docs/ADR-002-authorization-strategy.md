# ADR-002: Authorization strategy for admin routes

## Status
Accepted

## Context
KBAI has two parallel admin-authorization implementations:

- DB-query-based checks in src/lib/rbac.ts via requireAdminAccess()
- JWT-claims-based checks in src/lib/admin-middleware.ts via adminAuthMiddleware

The DB-query-based path is the canonical implementation for production admin routes because it directly validates the current user's role in the database. The JWT-claims path is useful for performance-sensitive routes when role information is already present in the Supabase auth claims.

## Decision
- New admin routes should default to requireAdminAccess() from src/lib/rbac.ts unless there is a specific reason to use the JWT-claims path.
- JWT-claims-based checks may be used for performance-sensitive routes, but they require app_metadata to be present in the auth claims.
- The auth middleware in src/integrations/supabase/auth-middleware.ts now includes app_metadata in claims so role checks based on claims work as intended.

## Consequences
- Admin authorization remains consistent with the production pattern by default.
- Future development can rely on the JWT-claims path where appropriate, but only when the claim payload contains the expected role data.
