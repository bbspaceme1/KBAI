
DO $$
DECLARE
  v_id uuid;
  rec record;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('alwi@gmail.com',     'alwi123',     'alwi',  'user'::app_role),
    ('kaizen@gmail.com',   'kaizen123',   'kaizen','advisor'::app_role),
    ('admin@kbai.local',   'Admin#2026!', 'admin', 'admin'::app_role)
  ) AS t(email, pw, uname, role)
  LOOP
    SELECT id INTO v_id FROM auth.users WHERE email = rec.email;
    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        rec.email, crypt(rec.pw, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', rec.uname, 'display_name', rec.uname),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_id,
        jsonb_build_object('sub', v_id::text, 'email', rec.email, 'email_verified', true),
        'email', v_id::text, now(), now(), now()
      );
    ELSE
      UPDATE auth.users
        SET encrypted_password = crypt(rec.pw, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
      WHERE id = v_id;
    END IF;

    INSERT INTO public.profiles (id, username, display_name)
      VALUES (v_id, rec.uname, rec.uname)
      ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name;

    DELETE FROM public.user_roles WHERE user_id = v_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, rec.role);

    INSERT INTO public.cash_balances (user_id, balance) VALUES (v_id, 0)
      ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;
