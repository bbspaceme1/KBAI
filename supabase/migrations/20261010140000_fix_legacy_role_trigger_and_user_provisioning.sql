-- Keep the canonical Company OS role source in public.user_sub_roles.
-- The historical user_roles table remains untouched for migration lineage only.
-- Its old trigger treated a user_roles row as auth.users, causing auth user
-- provisioning to fail with "record NEW has no field raw_app_meta_data".

BEGIN;

DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
DROP FUNCTION IF EXISTS public.add_role_to_jwt();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $handle_new_user$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_sub_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$handle_new_user$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMIT;
