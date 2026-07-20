-- Fix deprecated lovable.app domain in price alert cron and disable unsafe archive function
-- Date: 2026-07-21

-- Unschedule the old cron job that points to deprecated lovable.app
SELECT cron.unschedule('evaluate-price-alerts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='evaluate-price-alerts');

-- Update price alert cron to point to current production domain
-- Note: Update https://kbaiterminal.vercel.app to your actual production domain
SELECT cron.schedule(
  'evaluate-price-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kbaiterminal.vercel.app/api/evaluate-price-alerts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer '||current_setting('app.settings.api_key')||'"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Disable archive_old_data function - it currently does hard DELETE which is dangerous
-- Before re-enabling, migrate to true archive (move to cold storage table) not permanent deletion
CREATE OR REPLACE FUNCTION archive_old_data(days_old INTEGER DEFAULT 365)
RETURNS TABLE(archived_table TEXT, archived_count INTEGER) AS $$
BEGIN
  RAISE EXCEPTION 'archive_old_data is disabled: hard-delete of financial data is dangerous. Contact admin to migrate to true archive (cold storage) instead of deletion.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_data IS 'DISABLED: Original implementation did hard DELETE of transactions and audit logs after 365 days. This is dangerous for compliance and investor data retention. Must be redesigned to move data to cold storage table instead of permanent deletion.';
