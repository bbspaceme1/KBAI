-- Data Export and Account Deletion Infrastructure
-- Supports GDPR/UU PDP compliance for data portability and right to be forgotten

-- ============================================================================
-- DATA EXPORT REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Export configuration
  format TEXT DEFAULT 'JSON' CHECK (format IN ('JSON', 'CSV')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  
  -- Data sections to include
  include_transactions BOOLEAN DEFAULT true,
  include_watchlist BOOLEAN DEFAULT true,
  include_ai_logs BOOLEAN DEFAULT false,
  include_activity_log BOOLEAN DEFAULT true,
  
  -- File storage
  file_url TEXT,
  file_size_bytes BIGINT,
  
  -- Error tracking
  error TEXT,
  
  -- Lifecycle
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  
  CONSTRAINT export_request_lifecycle CHECK (
    CASE
      WHEN status = 'COMPLETED' THEN completed_at IS NOT NULL AND file_url IS NOT NULL
      WHEN status = 'FAILED' THEN error IS NOT NULL
      ELSE TRUE
    END
  )
);

-- Enable RLS
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own exports
CREATE POLICY "Users can view own exports" ON data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

-- RLS: Users can create export requests
CREATE POLICY "Users can create export requests" ON data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for efficient queries
CREATE INDEX idx_data_exports_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_exports_status ON data_export_requests(status);
CREATE INDEX idx_data_exports_expires_at ON data_export_requests(expires_at)
  WHERE status != 'COMPLETED';

-- ============================================================================
-- ACCOUNT DELETION INFRASTRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS deletion_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,
  
  CONSTRAINT code_length CHECK (length(code) = 6)
);

-- Index for code lookups
CREATE INDEX idx_deletion_codes_user_id_code 
  ON deletion_verification_codes(user_id, code);

-- Auto-clean expired codes (PostgreSQL job scheduler)
CREATE OR REPLACE FUNCTION cleanup_expired_deletion_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM deletion_verification_codes
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACCOUNT DELETION LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE account_deletion_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view deletion logs for auditing
CREATE POLICY "Admins can view deletion logs" ON account_deletion_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Retention periods (days)
  retain_transactions_days INTEGER DEFAULT 2555, -- 7 years for tax compliance
  retain_audit_logs_days INTEGER DEFAULT 365,
  retain_ai_logs_days INTEGER DEFAULT 90,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own policy
CREATE POLICY "Users can view own retention policy" ON data_retention_policies
  FOR SELECT USING (auth.uid() = user_id);

-- RLS: Admins can manage policies
CREATE POLICY "Admins can manage policies" ON data_retention_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- DATA ACCESS AUDIT TRAIL
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('EXPORT_INITIATED', 'EXPORT_DOWNLOADED', 'ACCOUNT_DELETED', 'DATA_CORRECTED')),
  accessed_by UUID,
  accessed_at TIMESTAMP DEFAULT now(),
  metadata JSONB,
  
  CONSTRAINT action_tracking CHECK (
    CASE
      WHEN action = 'EXPORT_DOWNLOADED' THEN accessed_by IS NOT NULL
      ELSE TRUE
    END
  )
);

-- Enable RLS
ALTER TABLE data_access_audit ENABLE ROW LEVEL SECURITY;

-- RLS: Admins only can view audit trail
CREATE POLICY "Admins view audit trail" ON data_access_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS FOR DATA PRIVACY OPERATIONS
-- ============================================================================

/**
 * Function to anonymize user data for GDPR compliance
 * Called when account is deleted
 */
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Anonymize profile
  UPDATE profiles
  SET name = 'Deleted User ' || substring(p_user_id::text, 1, 8),
      full_name = NULL,
      avatar_url = NULL,
      phone = NULL,
      bio = NULL
  WHERE id = p_user_id;
  
  -- Log deletion
  INSERT INTO data_access_audit (user_id, action, metadata)
  VALUES (p_user_id, 'ACCOUNT_DELETED', jsonb_build_object('timestamp', now()));
  
  -- Mark auth user as deleted
  UPDATE auth.users
  SET email = 'deleted_' || substring(p_user_id::text, 1, 8) || '@deleted.kbai.id',
      email_confirmed_at = NULL,
      deleted_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Schedule periodic cleanup of expired export files
 */
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  -- Delete export records older than 7 days
  DELETE FROM data_export_requests
  WHERE expires_at < now() AND status IN ('COMPLETED', 'FAILED');
  
  -- TODO: Also delete files from storage (requires external trigger)
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLIANCE VIEWS
-- ============================================================================

-- View for compliance officers to see data retention compliance
CREATE OR REPLACE VIEW data_compliance_status AS
SELECT
  u.id as user_id,
  u.email,
  p.name,
  COALESCE(drp.retain_transactions_days, 2555) as retain_transactions_days,
  COALESCE(drp.retain_audit_logs_days, 365) as retain_audit_logs_days,
  COALESCE(drp.retain_ai_logs_days, 90) as retain_ai_logs_days,
  (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) as transaction_count,
  (SELECT COUNT(*) FROM audit_logs al WHERE al.user_id = u.id) as audit_log_count
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN data_retention_policies drp ON drp.user_id = u.id;

-- ============================================================================
-- ENABLE RLS ON VIEWS
-- ============================================================================

GRANT SELECT ON data_compliance_status TO authenticated;

-- Allow admins to view compliance status
CREATE POLICY "Admins view compliance status" ON data_compliance_status
  AS PERMISSIVE FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));
