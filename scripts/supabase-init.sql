-- v0 Autonomous Error Tracking System
-- Supabase Schema for error history, patterns, and autonomous fixes

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  
  -- Error identification
  error_type text NOT NULL, -- 'build_error', 'lint_error', 'type_error', 'runtime_error', 'deploy_error'
  error_category text, -- 'circular_dependency', 'missing_import', 'type_mismatch', etc.
  error_message text NOT NULL,
  error_hash text UNIQUE, -- Hash of error for pattern matching
  
  -- Context
  deployment_id text,
  branch text DEFAULT 'main',
  commit_hash text,
  file_path text, -- File where error occurred
  line_number integer,
  
  -- Severity
  severity text CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
  
  -- Tracking
  is_fixed boolean DEFAULT false,
  fix_attempt_count integer DEFAULT 0,
  last_seen timestamp DEFAULT now(),
  occurrence_count integer DEFAULT 1
);

-- Create fix_history table
CREATE TABLE IF NOT EXISTS fix_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  
  -- Relationship
  error_log_id uuid REFERENCES error_logs(id) ON DELETE CASCADE,
  
  -- Fix details
  fix_type text NOT NULL, -- 'auto_format', 'import_add', 'env_var', 'dependency_update', etc.
  fix_description text,
  fix_code text, -- The actual fix applied
  
  -- Result
  success boolean DEFAULT false,
  result_message text,
  new_error_introduced boolean DEFAULT false,
  new_error_id uuid REFERENCES error_logs(id), -- If fix caused new error
  
  -- Rollback
  was_rolled_back boolean DEFAULT false,
  rollback_reason text
);

-- Create error_patterns table for ML/pattern recognition
CREATE TABLE IF NOT EXISTS error_patterns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  
  -- Pattern identification
  pattern_name text UNIQUE NOT NULL,
  error_category text NOT NULL,
  error_regex text, -- Regex to match similar errors
  
  -- Recommended fix
  recommended_fix_type text,
  fix_confidence_score real DEFAULT 0.0, -- 0.0 to 1.0
  
  -- Statistics
  total_occurrences integer DEFAULT 1,
  successful_fixes integer DEFAULT 0,
  failed_fixes integer DEFAULT 0,
  
  -- Learning
  is_active boolean DEFAULT true,
  notes text
);

-- Create deployment_health table
CREATE TABLE IF NOT EXISTS deployment_health (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  
  -- Deployment info
  deployment_id text UNIQUE,
  status text CHECK (status IN ('QUEUED', 'BUILDING', 'READY', 'ERROR', 'READY_ROLLBACK')) DEFAULT 'QUEUED',
  duration_ms integer,
  
  -- Build metrics
  bundle_size_kb integer,
  build_warnings integer DEFAULT 0,
  build_errors integer DEFAULT 0,
  
  -- Deployment result
  success boolean DEFAULT false,
  error_summary text,
  
  -- Auto-fix tracking
  auto_fix_applied boolean DEFAULT false,
  auto_fix_count integer DEFAULT 0,
  rollback_triggered boolean DEFAULT false
);

-- Create autonomous_actions table for audit trail
CREATE TABLE IF NOT EXISTS autonomous_actions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  
  -- Action details
  action_type text NOT NULL, -- 'auto_fix', 'rollback', 'alert', 'investigate'
  action_status text CHECK (action_status IN ('PENDING', 'EXECUTING', 'SUCCESS', 'FAILED')) DEFAULT 'PENDING',
  
  -- Context
  deployment_id text,
  error_log_id uuid REFERENCES error_logs(id),
  fix_history_id uuid REFERENCES fix_history(id),
  
  -- Execution
  command_executed text,
  execution_result text,
  execution_time_ms integer,
  
  -- Confidence
  confidence_score real DEFAULT 0.0,
  risk_assessment text -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_hash ON error_logs(error_hash);
CREATE INDEX idx_fix_history_error ON fix_history(error_log_id);
CREATE INDEX idx_patterns_category ON error_patterns(error_category);
CREATE INDEX idx_deployment_status ON deployment_health(status);
CREATE INDEX idx_autonomous_actions_status ON autonomous_actions(action_status);

-- Create views for analysis
CREATE OR REPLACE VIEW v_error_summary AS
SELECT 
  error_type,
  COUNT(*) as total_errors,
  SUM(CASE WHEN is_fixed THEN 1 ELSE 0 END) as fixed_count,
  ROUND(100.0 * SUM(CASE WHEN is_fixed THEN 1 ELSE 0 END) / COUNT(*), 2) as fix_percentage,
  MAX(last_seen) as last_error_time
FROM error_logs
GROUP BY error_type;

CREATE OR REPLACE VIEW v_recent_errors AS
SELECT 
  el.id,
  el.created_at,
  el.error_type,
  el.error_message,
  el.severity,
  COUNT(fh.id) as fix_attempts,
  el.is_fixed
FROM error_logs el
LEFT JOIN fix_history fh ON el.id = fh.error_log_id
WHERE el.created_at > now() - interval '24 hours'
GROUP BY el.id
ORDER BY el.created_at DESC;

-- Enable Row Level Security (optional - for multi-tenant setups)
-- ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read for authenticated users" ON error_logs
--   FOR SELECT USING (auth.role() = 'authenticated');
