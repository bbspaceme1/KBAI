ALTER FUNCTION public.claim_idx_etl_partition(TEXT, DATE, TEXT, INTEGER) RENAME TO claim_idx_etl_partition_legacy;

CREATE OR REPLACE FUNCTION public.claim_idx_etl_partition(
  p_job_id TEXT,
  p_partition_key DATE,
  p_worker_id TEXT,
  p_lease_seconds INTEGER DEFAULT 900
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_attempt INTEGER;
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

  SELECT attempt INTO claimed_attempt
  FROM public.idx_etl_checkpoints
  WHERE job_id = p_job_id AND partition_key = p_partition_key
    AND worker_id = p_worker_id AND status = 'RUNNING'
    AND lease_until > now();
  RETURN COALESCE(claimed_attempt, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_idx_etl_checkpoint(
  p_job_id TEXT,
  p_partition_key DATE,
  p_worker_id TEXT,
  p_attempt INTEGER,
  p_status TEXT,
  p_records_received INTEGER DEFAULT 0,
  p_expected_count INTEGER DEFAULT NULL,
  p_missing_count INTEGER DEFAULT 0,
  p_duplicate_count INTEGER DEFAULT 0,
  p_primary_error TEXT DEFAULT NULL,
  p_checkpoint_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE public.idx_etl_checkpoints
  SET status = p_status,
      records_received = p_records_received,
      expected_count = p_expected_count,
      missing_count = p_missing_count,
      duplicate_count = p_duplicate_count,
      primary_error = p_primary_error,
      checkpoint_error = p_checkpoint_error,
      completed_at = CASE WHEN p_status IN ('SUCCESS', 'PARTIAL', 'FAILED') THEN now() ELSE completed_at END,
      lease_until = CASE WHEN p_status IN ('SUCCESS', 'PARTIAL', 'FAILED') THEN NULL ELSE lease_until END,
      updated_at = now()
  WHERE job_id = p_job_id AND partition_key = p_partition_key
    AND worker_id = p_worker_id AND attempt = p_attempt
    AND status = 'RUNNING' AND lease_until > now();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_idx_etl_partition(TEXT, DATE, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_idx_etl_checkpoint(TEXT, DATE, TEXT, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_idx_etl_partition(TEXT, DATE, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_idx_etl_checkpoint(TEXT, DATE, TEXT, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT) TO service_role;
DROP FUNCTION public.claim_idx_etl_partition_legacy(TEXT, DATE, TEXT, INTEGER);
