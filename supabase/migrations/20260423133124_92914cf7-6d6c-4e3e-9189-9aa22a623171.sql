-- Add SMF (Sucorinvest Maxi Fund) to benchmark enum, deprecate MAMI
ALTER TYPE public.benchmark_symbol ADD VALUE IF NOT EXISTS 'SMF';
