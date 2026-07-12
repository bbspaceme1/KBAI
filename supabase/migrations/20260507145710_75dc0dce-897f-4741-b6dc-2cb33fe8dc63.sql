CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('evaluate-price-alerts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='evaluate-price-alerts');

SELECT cron.schedule(
  'evaluate-price-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--a775bbc5-96c6-420c-bdd9-170d49f9f1b8.lovable.app/api/public/evaluate-price-alerts',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ra2N2Y2xkdHNuZWJucGtqd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTQ2ODksImV4cCI6MjA5MzczMDY4OX0.CRumMaSU-cYC_dlDBtlA4TkNBE2TW4-lRtLK-h9ReIc"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);