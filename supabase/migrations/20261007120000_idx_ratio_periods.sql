-- Preserve one financial-ratio snapshot per issuer and fiscal period.
ALTER TABLE idx_financial_ratios
  ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
  ADD COLUMN IF NOT EXISTS fiscal_quarter SMALLINT,
  ADD COLUMN IF NOT EXISTS reporting_period TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'idx',
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ratios_ticker_period
  ON idx_financial_ratios (ticker, fiscal_year, fiscal_quarter);

COMMENT ON COLUMN idx_financial_ratios.reporting_period IS 'Canonical IDX fiscal period, for example 2026-Q3';
