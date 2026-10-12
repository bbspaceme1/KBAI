-- T07 proposal: remove non-read privileges from the unauthenticated anon role.
-- Human approval required before staging/production application.
-- SELECT privileges and existing RLS policies are intentionally preserved.
-- This migration does not grant any new privileges to authenticated or service_role.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM anon;
