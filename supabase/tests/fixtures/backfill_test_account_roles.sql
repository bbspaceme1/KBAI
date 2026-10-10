-- Test-only fixture. Never apply this file as a production migration.
-- Run only after creating the dedicated admin/advisor test accounts in an isolated database.
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
    RAISE EXCEPTION 'Test fixture role backfill incomplete: %', missing_roles;
  END IF;
END;
$$;
