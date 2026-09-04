-- Lock down SECURITY DEFINER functions exposed through the public schema.
-- Supabase advisor: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
-- These functions are trigger/internal helpers and have no application RPC callers.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_cash() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;