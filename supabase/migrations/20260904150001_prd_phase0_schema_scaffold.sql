CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free', status text NOT NULL DEFAULT 'active', started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON public.memberships(user_id);

CREATE TABLE IF NOT EXISTS public.methodologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, active_version_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.methodology_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), methodology_id uuid NOT NULL REFERENCES public.methodologies(id) ON DELETE CASCADE, version text NOT NULL, config jsonb NOT NULL DEFAULT '{}'::jsonb, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(methodology_id, version)
);
ALTER TABLE public.methodologies ADD CONSTRAINT methodologies_active_version_fk FOREIGN KEY (active_version_id) REFERENCES public.methodology_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS public.portfolio_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, score numeric NOT NULL, assessed_at timestamptz NOT NULL DEFAULT now(), details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS public.portfolio_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, severity text NOT NULL, event_type text NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.portfolio_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, alert_type text NOT NULL, message text NOT NULL, acknowledged_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_health_user_idx ON public.portfolio_health(user_id);
CREATE INDEX IF NOT EXISTS portfolio_risk_events_user_idx ON public.portfolio_risk_events(user_id);
CREATE INDEX IF NOT EXISTS portfolio_alerts_user_idx ON public.portfolio_alerts(user_id);

CREATE TABLE IF NOT EXISTS public.assistance_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','waiting_on_user','resolved','closed')), subject text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES public.assistance_cases(id) ON DELETE CASCADE, advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, assigned_at timestamptz NOT NULL DEFAULT now(), UNIQUE(case_id, advisor_id)
);
CREATE TABLE IF NOT EXISTS public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES public.assistance_cases(id) ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES auth.users(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.case_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES public.assistance_cases(id) ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES auth.users(id), analysis jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_assignments_advisor_idx ON public.case_assignments(advisor_id);
CREATE INDEX IF NOT EXISTS assistance_cases_user_idx ON public.assistance_cases(user_id);

CREATE TABLE IF NOT EXISTS public.guidance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES public.assistance_cases(id) ON DELETE CASCADE, author_id uuid NOT NULL REFERENCES auth.users(id), body text NOT NULL DEFAULT 'Informasi ini bersifat edukasi dan bukan rekomendasi investasi personal.', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guidance_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), guidance_id uuid NOT NULL REFERENCES public.guidance(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, acknowledged_at timestamptz NOT NULL DEFAULT now(), UNIQUE(guidance_id, user_id)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['memberships','methodologies','methodology_versions','portfolio_health','portfolio_risk_events','portfolio_alerts','assistance_cases','case_assignments','case_notes','case_analysis','guidance','guidance_acknowledgements'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

CREATE POLICY memberships_self_select ON public.memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY portfolio_health_self_select ON public.portfolio_health FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY portfolio_risk_events_self_select ON public.portfolio_risk_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY portfolio_alerts_self_select ON public.portfolio_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY cases_self_select ON public.assistance_cases FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.case_assignments a WHERE a.case_id = id AND a.advisor_id = auth.uid()));
CREATE POLICY case_assignments_assigned_select ON public.case_assignments FOR SELECT TO authenticated USING (advisor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.assistance_cases c WHERE c.id = case_id AND c.user_id = auth.uid()));
CREATE POLICY guidance_case_select ON public.guidance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.assistance_cases c WHERE c.id = case_id AND c.user_id = auth.uid()));
CREATE POLICY guidance_ack_self_all ON public.guidance_acknowledgements FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
