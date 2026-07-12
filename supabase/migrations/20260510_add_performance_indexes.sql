-- Performance Indexes Migration
-- Addresses DB-03: Missing database indexes on heavy queries
-- Impact: 10x+ faster queries on eod_prices, transactions, and audit logs

CREATE INDEX IF NOT EXISTS idx_eod_prices_date_ticker ON eod_prices(date DESC, ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_kbai_index_date ON kbai_index(date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_prices_date ON benchmark_prices(date DESC, symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active ON price_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active);

-- Comment untuk dokumentasi
COMMENT ON INDEX idx_eod_prices_date_ticker IS 'EOD prices frequent filtering by date and ticker';
COMMENT ON INDEX idx_transactions_user_date IS 'User transaction history lookups';
COMMENT ON INDEX idx_holdings_user IS 'User holdings queries';
COMMENT ON INDEX idx_audit_logs_created IS 'Audit log ordering by creation date';
