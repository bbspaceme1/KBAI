-- Migration: Add role claims to JWT
-- File: supabase/migrations/20260512_add_role_to_jwt.sql

-- Create function to add role to JWT claims
CREATE OR REPLACE FUNCTION add_role_to_jwt()
RETURNS TRIGGER AS $$
DECLARE
  user_roles TEXT[];
BEGIN
  -- Get user roles as array
  SELECT array_agg(role) INTO user_roles
  FROM user_roles
  WHERE user_id = NEW.id;

  -- Set custom claims in auth.users.raw_app_meta_data
  NEW.raw_app_meta_data = jsonb_set(
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    '{roles}',
    COALESCE(to_jsonb(user_roles), '[]'::jsonb)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update JWT claims on user role changes
DROP TRIGGER IF EXISTS on_user_role_change ON user_roles;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION add_role_to_jwt();

-- Update existing users' JWT claims
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{roles}',
  COALESCE(
    (SELECT jsonb_agg(role) FROM user_roles WHERE user_id = auth.users.id),
    '[]'::jsonb
  )
);