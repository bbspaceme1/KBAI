-- P26: restore privileged roles for seeded test accounts.
-- The user_roles table has a unique constraint on (user_id, role).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@bbspace.test'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'advisor'::public.app_role
FROM auth.users
WHERE email = 'advisor@bbspace.test'
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
DECLARE
  missing_roles TEXT;
BEGIN
  SELECT string_agg(expected.email || ':' || expected.role, ', ' ORDER BY expected.email)
  INTO missing_roles
  FROM (
    VALUES
      ('admin@bbspace.test'::text, 'admin'::public.app_role),
      ('advisor@bbspace.test'::text, 'advisor'::public.app_role)
  ) AS expected(email, role)
  LEFT JOIN auth.users u ON u.email = expected.email
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = expected.role
  WHERE ur.user_id IS NULL;

  IF missing_roles IS NOT NULL THEN
    RAISE EXCEPTION 'P26 role backfill incomplete: %', missing_roles;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

COMMENT ON FUNCTION public.has_role(UUID, public.app_role) IS
  'Checks an application role for an existing user; execution is restricted to authenticated and service_role.';

-- Verification checklist: apply through staging first, then production via docs/RUNBOOK_MIGRATION_APPLY.md.
-- Do not run supabase db push against production from this migration change.
