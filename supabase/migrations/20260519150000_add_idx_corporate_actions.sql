-- Migration: Add corporate actions table for IDX
BEGIN;

CREATE TABLE IF NOT EXISTS idx_corporate_actions (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- e.g., 'dividend', 'split', 'right_issue', 'bonus'
  announcement_date DATE,
  effective_date DATE,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, action_type, effective_date)
);

ALTER TABLE idx_corporate_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read idx_corporate_actions" ON idx_corporate_actions FOR SELECT USING (true);

COMMIT;
