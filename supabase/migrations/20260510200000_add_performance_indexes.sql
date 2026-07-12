-- Add database indexes for performance optimization
-- Based on audit findings for community queries and holdings performance

-- Index for holdings active positions (used in community stats)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holdings_active
  ON holdings(user_id, ticker)
  WHERE total_lot > 0;

-- Index for latest EOD prices (used in portfolio calculations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eod_prices_latest
  ON eod_prices(ticker, date DESC);

-- Index for KBAI index queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kbai_index_date
  ON kbai_index(date DESC);

-- Index for transactions queries (already exists but ensure)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transacted_at DESC);

-- Index for audit logs (for compliance and debugging)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action
  ON audit_logs(user_id, action, created_at DESC);

-- Index for price alerts (for cron job efficiency)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_alerts_active
  ON price_alerts(user_id, is_active)
  WHERE is_active = true;