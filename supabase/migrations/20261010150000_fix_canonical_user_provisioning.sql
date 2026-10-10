-- User provisioning must seed the canonical Company OS role source.
-- The legacy user_roles table is preserved for lineage but is not written by
-- new-user provisioning and is not an authorization source.
BEGIN;

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
