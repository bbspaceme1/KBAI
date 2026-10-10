-- Correct role-claim synchronization: this trigger fires on public.user_roles,
-- not auth.users. Never read or assign auth.users-only fields on NEW/OLD role rows.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_user_role_claims(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync$
DECLARE
  v_roles text[];
BEGIN
  SELECT array_agg(r.role::text ORDER BY r.role::text)
    INTO v_roles
  FROM public.user_roles AS r
  WHERE r.user_id = p_user_id;

  UPDATE auth.users AS u
  SET raw_app_meta_data = jsonb_set(
    COALESCE(u.raw_app_meta_data, '{}'::jsonb),
    '{roles}',
    COALESCE(to_jsonb(v_roles), '[]'::jsonb),
    true
  )
  WHERE u.id = p_user_id;
END;
$sync$;

REVOKE ALL ON FUNCTION public.sync_user_role_claims(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_role_claims(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.add_role_to_jwt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $trigger$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_user_role_claims(OLD.user_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.sync_user_role_claims(OLD.user_id);
  END IF;

  PERFORM public.sync_user_role_claims(NEW.user_id);
  RETURN NEW;
END;
$trigger$;

REVOKE ALL ON FUNCTION public.add_role_to_jwt() FROM PUBLIC, anon, authenticated;
-- Existing trigger ownership invokes the trigger function; service-role maintenance may
-- also invoke it explicitly if required. It is not a client-callable RPC.
GRANT EXECUTE ON FUNCTION public.add_role_to_jwt() TO service_role;

DO $backfill$
DECLARE
  user_row record;
BEGIN
  FOR user_row IN SELECT id FROM auth.users LOOP
    PERFORM public.sync_user_role_claims(user_row.id);
  END LOOP;
END;
$backfill$;

COMMIT;
