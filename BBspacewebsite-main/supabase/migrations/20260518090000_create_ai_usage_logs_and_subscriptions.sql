-- Migration: create ai_usage_logs and subscriptions tables
BEGIN;

-- Subscriptions table to store per-user tier and explicit limits
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier text NOT NULL,
  daily_limit bigint NOT NULL DEFAULT 50000,
  monthly_limit bigint NOT NULL DEFAULT 500000,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- AI usage logs: records each AI invocation and token/cost accounting
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  total_tokens integer NOT NULL,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  operation text,
  status text CHECK (status IN ('success','error')) DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);

COMMIT;
