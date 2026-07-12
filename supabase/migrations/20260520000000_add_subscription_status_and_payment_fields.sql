-- Migration: extend subscriptions schema for monetization and payment metadata
BEGIN;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_gateway text NOT NULL DEFAULT 'midtrans';

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS order_id text;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.subscriptions
  ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'cancelled', 'expired', 'trial'));

COMMIT;
