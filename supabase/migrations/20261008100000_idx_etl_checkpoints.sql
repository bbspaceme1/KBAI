CREATE TABLE IF NOT EXISTS public.idx_etl_checkpoints (
  job_id TEXT NOT NULL,
  partition_key DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED')),
  records_received INTEGER NOT NULL DEFAULT 0,
  expected_count INTEGER,
  missing_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, partition_key)
);

ALTER TABLE public.idx_etl_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.idx_etl_checkpoints FROM anon, authenticated;
GRANT ALL ON public.idx_etl_checkpoints TO service_role;
CREATE INDEX IF NOT EXISTS idx_etl_checkpoints_status ON public.idx_etl_checkpoints (job_id, status, partition_key);
