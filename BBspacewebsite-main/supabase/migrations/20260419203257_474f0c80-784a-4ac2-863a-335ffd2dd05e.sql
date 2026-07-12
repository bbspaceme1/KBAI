DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@kbai.local') THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@kbai.local';
  ELSE
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'admin@kbai.local',
      crypt('Admin#2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","display_name":"Administrator"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      new_user_id::text,
      format('{"sub":"%s","email":"%s","email_verified":true}', new_user_id, 'admin@kbai.local')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- Ensure profile exists (in case trigger didn't fire for pre-existing user)
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (new_user_id, 'admin', 'Administrator')
  ON CONFLICT (id) DO NOTHING;

  -- Promote to admin (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;