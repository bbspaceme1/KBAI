-- Orchestration System Schema
-- Tracks bug reports, audit results, and admin actions

-- Bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved')),
  reported_by uuid REFERENCES auth.users(id),
  gpt_summary text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  CONSTRAINT title_not_empty CHECK (title != '')
);

-- Audit results table
CREATE TABLE IF NOT EXISTS audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL UNIQUE,
  markdown text NOT NULL,
  created_at timestamp DEFAULT now(),
  completed_at timestamp,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  CONSTRAINT job_id_not_empty CHECK (job_id != '')
);

-- Orchestration audit log (track all admin actions)
CREATE TABLE IF NOT EXISTS orchestration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_id text,
  result text,
  performed_at timestamp DEFAULT now(),
  
  CONSTRAINT action_not_empty CHECK (action != ''),
  CONSTRAINT performed_at_not_future CHECK (performed_at <= now())
);

-- PR tracking table
CREATE TABLE IF NOT EXISTS pull_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_url text NOT NULL UNIQUE,
  pr_number int NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_from_orchestration_log_id uuid REFERENCES orchestration_audit_log(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  created_at timestamp DEFAULT now(),
  merged_at timestamp,
  
  CONSTRAINT pr_url_not_empty CHECK (pr_url != ''),
  CONSTRAINT pr_number_positive CHECK (pr_number > 0)
);

-- Create indexes
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at);

CREATE INDEX idx_audit_results_job_id ON audit_results(job_id);
CREATE INDEX idx_audit_results_status ON audit_results(status);

CREATE INDEX idx_orchestration_audit_log_performed_by ON orchestration_audit_log(performed_by);
CREATE INDEX idx_orchestration_audit_log_action ON orchestration_audit_log(action);
CREATE INDEX idx_orchestration_audit_log_performed_at ON orchestration_audit_log(performed_at);

CREATE INDEX idx_pull_requests_status ON pull_requests(status);
CREATE INDEX idx_pull_requests_created_by ON pull_requests(created_by);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can access these tables
CREATE POLICY "Admin can read bug reports" ON bug_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can read audit results" ON audit_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can read audit logs" ON orchestration_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can read pull requests" ON pull_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Allow inserts/updates only for admins
CREATE POLICY "Admin can insert bug reports" ON bug_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update bug reports" ON bug_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert audit logs" ON orchestration_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert audit results" ON audit_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert pull requests" ON pull_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update pull requests" ON pull_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );
