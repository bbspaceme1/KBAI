-- Telegram identity and community verification foundation.
CREATE TABLE IF NOT EXISTS public.telegram_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint NOT NULL UNIQUE,
  title text NOT NULL,
  chat_type text NOT NULL CHECK (chat_type IN ('channel', 'group', 'supergroup')),
  is_master_gate boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  invite_link text,
  admin_contact_url text,
  invite_expiry_minutes integer NOT NULL DEFAULT 10 CHECK (invite_expiry_minutes BETWEEN 1 AND 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_one_active_master_gate
  ON public.telegram_chats (is_master_gate) WHERE is_master_gate AND is_active;

CREATE TABLE IF NOT EXISTS public.telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL REFERENCES public.telegram_users(telegram_user_id) ON DELETE CASCADE,
  telegram_chat_id bigint NOT NULL REFERENCES public.telegram_chats(telegram_chat_id) ON DELETE CASCADE,
  telegram_status text NOT NULL,
  is_member boolean NOT NULL DEFAULT false,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (telegram_user_id, telegram_chat_id)
);

CREATE TABLE IF NOT EXISTS public.telegram_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL UNIQUE,
  verification_status text NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','CHANNEL_REQUIRED','GROUPS_REQUIRED','VERIFIED','REVOKED','ERROR')),
  website_access boolean NOT NULL DEFAULT false,
  admin_status text,
  verified_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL REFERENCES public.telegram_users(telegram_user_id) ON DELETE CASCADE,
  telegram_chat_id bigint NOT NULL REFERENCES public.telegram_chats(telegram_chat_id) ON DELETE CASCADE,
  invite_link text NOT NULL,
  member_limit integer NOT NULL DEFAULT 1 CHECK (member_limit = 1),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (telegram_user_id, telegram_chat_id, is_active)
);

CREATE TABLE IF NOT EXISTS public.telegram_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  telegram_user_id bigint,
  event_type text NOT NULL,
  telegram_chat_id bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telegram_verifications_select_own ON public.telegram_verifications;
CREATE POLICY telegram_verifications_select_own ON public.telegram_verifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS telegram_users_select_own ON public.telegram_users;
CREATE POLICY telegram_users_select_own ON public.telegram_users FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS telegram_memberships_select_own ON public.telegram_memberships;
CREATE POLICY telegram_memberships_select_own ON public.telegram_memberships FOR SELECT TO authenticated USING (telegram_user_id IN (SELECT telegram_user_id FROM public.telegram_users WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS telegram_invites_select_own ON public.telegram_invite_links;
CREATE POLICY telegram_invites_select_own ON public.telegram_invite_links FOR SELECT TO authenticated USING (telegram_user_id IN (SELECT telegram_user_id FROM public.telegram_users WHERE user_id = auth.uid()));

REVOKE ALL ON public.telegram_chats, public.telegram_users, public.telegram_memberships, public.telegram_verifications, public.telegram_invite_links, public.telegram_verification_events FROM anon;
GRANT SELECT ON public.telegram_chats TO authenticated;
GRANT SELECT ON public.telegram_users, public.telegram_memberships, public.telegram_verifications, public.telegram_invite_links TO authenticated;

COMMENT ON TABLE public.telegram_verifications IS 'Website authorization derived from server-side Telegram membership checks; never client-writable.';
COMMENT ON TABLE public.telegram_invite_links IS 'Per-user, single-use discussion-group invites. Master channel never receives generated invites.';
