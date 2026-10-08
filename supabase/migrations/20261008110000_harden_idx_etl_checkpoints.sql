ALTER TABLE public.idx_etl_checkpoints
  ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS primary_error TEXT,
  ADD COLUMN IF NOT EXISTS checkpoint_error TEXT;

CREATE OR REPLACE FUNCTION public.claim_idx_etl_partition(
  p_job_id TEXT,
  p_partition_key DATE,
  p_worker_id TEXT,
  p_lease_seconds INTEGER DEFAULT 900
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE claimed_count INTEGER;
BEGIN
  INSERT INTO public.idx_etl_checkpoints (job_id, partition_key, status, worker_id, attempt, started_at, lease_until, updated_at)
  VALUES (p_job_id, p_partition_key, 'RUNNING', p_worker_id, 1, now(), now() + make_interval(secs => p_lease_seconds), now())
  ON CONFLICT (job_id, partition_key) DO UPDATE SET
    status = 'RUNNING', worker_id = EXCLUDED.worker_id,
    attempt = idx_etl_checkpoints.attempt + 1, started_at = now(),
    completed_at = NULL, lease_until = now() + make_interval(secs => p_lease_seconds),
    primary_error = NULL, checkpoint_error = NULL, updated_at = now()
  WHERE idx_etl_checkpoints.status <> 'SUCCESS'
    AND (idx_etl_checkpoints.status <> 'RUNNING' OR idx_etl_checkpoints.lease_until IS NULL OR idx_etl_checkpoints.lease_until < now());
  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_idx_etl_partition(TEXT, DATE, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_idx_etl_partition(TEXT, DATE, TEXT, INTEGER) TO service_role;
CREATE INDEX IF NOT EXISTS idx_etl_checkpoints_lease ON public.idx_etl_checkpoints (status, lease_until);
