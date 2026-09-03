-- Canonical performance indexes consolidated from the duplicate performance migrations.

-- User roles and profiles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Holdings
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_holdings_total_lot ON holdings(total_lot) WHERE total_lot > 0;
CREATE INDEX IF NOT EXISTS idx_holdings_active ON holdings(user_id, ticker) WHERE total_lot > 0;
CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transacted_at DESC);

-- Cash balances and movements
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_id ON cash_balances(user_id);

-- EOD prices
CREATE INDEX IF NOT EXISTS idx_eod_prices_date_ticker ON eod_prices(date DESC, ticker);
CREATE INDEX IF NOT EXISTS idx_eod_prices_latest ON eod_prices(ticker, date DESC);

-- Portfolio snapshots
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, date DESC);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);

-- User sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active);

-- KBAI index, notifications, benchmarks, and price alerts
CREATE INDEX IF NOT EXISTS idx_kbai_index_date ON kbai_index(date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_prices_date ON benchmark_prices(date DESC, symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active ON price_alerts(user_id, is_active);