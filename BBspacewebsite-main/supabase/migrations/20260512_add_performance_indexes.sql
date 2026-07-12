-- Migration: Add performance indexes
-- File: supabase/migrations/20260512_add_performance_indexes.sql

-- Indexes for user_roles table (frequent role lookups)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Indexes for profiles table (frequent username/display_name lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Indexes for holdings table (portfolio queries)
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_holdings_total_lot ON holdings(total_lot) WHERE total_lot > 0;

-- Indexes for transactions table (transaction history)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);

-- Indexes for cash_balances table
CREATE INDEX IF NOT EXISTS idx_cash_balances_user_id ON cash_balances(user_id);

-- Indexes for audit_logs table (admin queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = true;

-- Indexes for kbai_index table (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_kbai_index_date ON kbai_index(date DESC);