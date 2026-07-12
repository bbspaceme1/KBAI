-- Soft Delete Implementation
-- Adds deleted_at columns and policies for GDPR compliance and data archival

-- Add deleted_at columns to key tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE cash_balances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for soft delete queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holdings_deleted_at ON holdings(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cash_balances_deleted_at ON cash_balances(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolios_deleted_at ON portfolios(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_alerts_deleted_at ON price_alerts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watchlists_deleted_at ON watchlists(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
-- Users table
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own active record" ON users
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own active record" ON users
  FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

-- Holdings table
DROP POLICY IF EXISTS "Users can view own holdings" ON holdings;
CREATE POLICY "Users can view own active holdings" ON holdings
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own holdings" ON holdings;
CREATE POLICY "Users can insert own holdings" ON holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own holdings" ON holdings;
CREATE POLICY "Users can update own active holdings" ON holdings
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Transactions table
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own active transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cash balances table
DROP POLICY IF EXISTS "Users can view own cash balance" ON cash_balances;
CREATE POLICY "Users can view own active cash balance" ON cash_balances
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own cash balance" ON cash_balances;
CREATE POLICY "Users can update own active cash balance" ON cash_balances
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Portfolios table (if exists)
DROP POLICY IF EXISTS "Users can view own portfolios" ON portfolios;
CREATE POLICY "Users can view own active portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Price alerts table
DROP POLICY IF EXISTS "Users can view own price alerts" ON price_alerts;
CREATE POLICY "Users can view own active price alerts" ON price_alerts
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Watchlists table
DROP POLICY IF EXISTS "Users can view own watchlists" ON watchlists;
CREATE POLICY "Users can view own active watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create functions for soft delete operations
CREATE OR REPLACE FUNCTION soft_delete_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Soft delete user and all related data
  UPDATE users SET deleted_at = NOW() WHERE id = user_uuid;
  UPDATE holdings SET deleted_at = NOW() WHERE user_id = user_uuid;
  UPDATE transactions SET deleted_at = NOW() WHERE user_id = user_uuid;
  UPDATE cash_balances SET deleted_at = NOW() WHERE user_id = user_uuid;
  UPDATE portfolios SET deleted_at = NOW() WHERE user_id = user_uuid;
  UPDATE price_alerts SET deleted_at = NOW() WHERE user_id = user_uuid;
  UPDATE watchlists SET deleted_at = NOW() WHERE user_id = user_uuid;

  -- Insert audit log
  INSERT INTO audit_logs (user_id, action, details, ip_address)
  VALUES (user_uuid, 'USER_SOFT_DELETED', jsonb_build_object('deleted_at', NOW()), inet_client_addr());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore soft-deleted user
CREATE OR REPLACE FUNCTION restore_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Restore user and all related data
  UPDATE users SET deleted_at = NULL WHERE id = user_uuid;
  UPDATE holdings SET deleted_at = NULL WHERE user_id = user_uuid;
  UPDATE transactions SET deleted_at = NULL WHERE user_id = user_uuid;
  UPDATE cash_balances SET deleted_at = NULL WHERE user_id = user_uuid;
  UPDATE portfolios SET deleted_at = NULL WHERE user_id = user_uuid;
  UPDATE price_alerts SET deleted_at = NULL WHERE user_id = user_uuid;
  UPDATE watchlists SET deleted_at = NULL WHERE user_id = user_uuid;

  -- Insert audit log
  INSERT INTO audit_logs (user_id, action, details, ip_address)
  VALUES (user_uuid, 'USER_RESTORED', jsonb_build_object('restored_at', NOW()), inet_client_addr());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for permanent deletion (GDPR compliance - after retention period)
CREATE OR REPLACE FUNCTION permanently_delete_user(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  retention_days INTEGER := 30; -- Configurable retention period
BEGIN
  -- Only allow permanent deletion after retention period
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = user_uuid
    AND deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * retention_days
  ) THEN
    RAISE EXCEPTION 'User must be soft-deleted for at least % days before permanent deletion', retention_days;
  END IF;

  -- Permanently delete all user data
  DELETE FROM audit_logs WHERE user_id = user_uuid;
  DELETE FROM holdings WHERE user_id = user_uuid;
  DELETE FROM transactions WHERE user_id = user_uuid;
  DELETE FROM cash_balances WHERE user_id = user_uuid;
  DELETE FROM portfolios WHERE user_id = user_uuid;
  DELETE FROM price_alerts WHERE user_id = user_uuid;
  DELETE FROM watchlists WHERE user_id = user_uuid;
  DELETE FROM user_roles WHERE user_id = user_uuid;
  DELETE FROM users WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for active users (excludes soft-deleted)
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- Create view for active holdings
CREATE OR REPLACE VIEW active_holdings AS
SELECT * FROM holdings WHERE deleted_at IS NULL;

-- Create view for active transactions
CREATE OR REPLACE VIEW active_transactions AS
SELECT * FROM transactions WHERE deleted_at IS NULL;

-- Function to archive old data (for data lifecycle management)
CREATE OR REPLACE FUNCTION archive_old_data(days_old INTEGER DEFAULT 365)
RETURNS TABLE(archived_table TEXT, archived_count INTEGER) AS $$
DECLARE
  archive_timestamp TIMESTAMPTZ := NOW() - INTERVAL '1 day' * days_old;
  table_name TEXT;
  count_deleted INTEGER;
BEGIN
  -- Archive old transactions (keep last 2 years of active data)
  DELETE FROM transactions
  WHERE transacted_at < archive_timestamp
  AND deleted_at IS NULL;

  GET DIAGNOSTICS count_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'transactions'::TEXT, count_deleted;

  -- Archive old audit logs (keep last 1 year)
  DELETE FROM audit_logs
  WHERE created_at < archive_timestamp;

  GET DIAGNOSTICS count_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'audit_logs'::TEXT, count_deleted;

  -- Archive old EOD prices (keep last 1 year)
  DELETE FROM eod_prices
  WHERE date < CURRENT_DATE - INTERVAL '1 year';

  GET DIAGNOSTICS count_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'eod_prices'::TEXT, count_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;