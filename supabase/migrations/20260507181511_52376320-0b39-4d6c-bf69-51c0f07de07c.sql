-- Economic events (calendar) table
CREATE TABLE public.economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  event_time time,
  country text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  importance smallint NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 3),
  actual numeric,
  forecast numeric,
  previous numeric,
  unit text,
  source text NOT NULL DEFAULT 'manual',
  source_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_economic_events_date ON public.economic_events (event_date DESC);
CREATE INDEX idx_economic_events_country ON public.economic_events (country, event_date DESC);
CREATE UNIQUE INDEX uq_economic_events_natural
  ON public.economic_events (source, country, event_date, title);

ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read economic events"
  ON public.economic_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and advisors manage economic events"
  ON public.economic_events FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor'));

CREATE TRIGGER trg_economic_events_updated
  BEFORE UPDATE ON public.economic_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Macro indicator time-series (ETL target for BPS / BI / FRED / World Bank)
CREATE TABLE public.macro_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  indicator text NOT NULL,
  period date NOT NULL,
  value numeric NOT NULL,
  unit text,
  source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_macro_indicators
  ON public.macro_indicators (country, indicator, period, source);
CREATE INDEX idx_macro_indicators_lookup
  ON public.macro_indicators (indicator, country, period DESC);

ALTER TABLE public.macro_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read macro indicators"
  ON public.macro_indicators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and advisors manage macro indicators"
  ON public.macro_indicators FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor'));

CREATE TRIGGER trg_macro_indicators_updated
  BEFORE UPDATE ON public.macro_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();