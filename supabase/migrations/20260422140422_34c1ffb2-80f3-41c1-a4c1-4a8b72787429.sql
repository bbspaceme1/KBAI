-- Add BTC to benchmark_symbol enum (Master Plan v1.1 §9.1)
ALTER TYPE public.benchmark_symbol ADD VALUE IF NOT EXISTS 'BTC';