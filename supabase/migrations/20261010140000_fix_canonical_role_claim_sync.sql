-- Repair legacy role-claim trigger that referenced auth.users-only fields
-- while running on public.user_roles rows. user_sub_roles is the canonical
-- application role source; keep JWT app_metadata aligned without trusting clients.
BEGIN;

DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;
DROP FUNCTION IF EXISTS public.add_role_to_jwt();

CREATE OR REPLACE FUNCTION public.sync_user_roles_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync_roles$
DECLARE
  affected_user_id uuid;
  role_claims jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
  ELSE
    affected_user_id := NEW.user_id;
  END IF;

  SELECT COALESCE(jsonb_agg(r.role::text ORDER BY r.role::text), '[]'::jsonb)
    INTO role_claims
  FROM public.user_sub_roles r
  WHERE r.user_id = affected_user_id;

  UPDATE auth.users u
  SET raw_app_meta_data = jsonb_set(
    COALESCE(u.raw_app_meta_data, '{}'::jsonb),
    '{roles}',
    role_claims,
    true
  )
  WHERE u.id = affected_user_id;

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    SELECT COALESCE(jsonb_agg(r.role::text ORDER BY r.role::text), '[]'::jsonb)
      INTO role_claims
    FROM public.user_sub_roles r
    WHERE r.user_id = OLD.user_id;

    UPDATE auth.users u
    SET raw_app_meta_data = jsonb_set(
      COALESCE(u.raw_app_meta_data, '{}'::jsonb),
      '{roles}',
      role_claims,
      true
    )
    WHERE u.id = OLD.user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$sync_roles$;

DROP TRIGGER IF EXISTS on_user_sub_role_change ON public.user_sub_roles;
CREATE TRIGGER on_user_sub_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_sub_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_app_metadata();

REVOKE ALL ON FUNCTION public.sync_user_roles_app_metadata() FROM PUBLIC, anon, authenticated;


-- Backfill derived JWT role claims from the canonical role table.
DO $backfill$
DECLARE
  user_row record;
  role_claims jsonb;
BEGIN
  FOR user_row IN SELECT id FROM auth.users LOOP
    SELECT COALESCE(jsonb_agg(r.role::text ORDER BY r.role::text), '[]'::jsonb)
      INTO role_claims
    FROM public.user_sub_roles r
    WHERE r.user_id = user_row.id;

    UPDATE auth.users u
    SET raw_app_meta_data = jsonb_set(
      COALESCE(u.raw_app_meta_data, '{}'::jsonb),
      '{roles}',
      role_claims,
      true
    )
    WHERE u.id = user_row.id;
  END LOOP;
END;
$backfill$;

COMMIT;
