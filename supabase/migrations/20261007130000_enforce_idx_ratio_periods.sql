-- Refuse silent NULL-period duplicates. Operators must backfill or quarantine legacy rows before this migration succeeds.
DO $$
DECLARE
  missing_periods BIGINT;
BEGIN
  SELECT count(*) INTO missing_periods
  FROM idx_financial_ratios
  WHERE fiscal_year IS NULL OR fiscal_quarter IS NULL;

  IF missing_periods > 0 THEN
    RAISE EXCEPTION
      'idx_financial_ratios contains % rows without fiscal period; backfill or quarantine them before enforcing period integrity',
      missing_periods;
  END IF;
END $$;

ALTER TABLE idx_financial_ratios
  ALTER COLUMN fiscal_year SET NOT NULL,
  ALTER COLUMN fiscal_quarter SET NOT NULL;

ALTER TABLE idx_financial_ratios
  ADD CONSTRAINT idx_financial_ratios_quarter_check
  CHECK (fiscal_quarter BETWEEN 1 AND 4);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ratios_ticker_period
  ON idx_financial_ratios (ticker, fiscal_year, fiscal_quarter);
