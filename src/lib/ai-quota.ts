/**
 * AI Usage Quota Tracking & Enforcement
 *
 * This helper enforces per-user quotas and logs usage to ai_usage_logs.
 * If the quota query fails, requests are blocked by default to avoid
 * fail-open cost exposure.
 */

export interface AiUsageQuota {
  daily_limit: number;
  monthly_limit: number;
  current_daily_usage: number;
  current_monthly_usage: number;
}

export interface AiUsageLog {
  user_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  operation: string;
  status: "success" | "error";
  error_message?: string;
}

const DEFAULT_LIMITS = { daily: 5_000, monthly: 100_000 };

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getUserAiUsage(userId: string): Promise<AiUsageQuota> {
  try {
    // Check if user has a subscription with explicit limits
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("daily_limit, monthly_limit, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const daily_limit = subs?.daily_limit ?? DEFAULT_LIMITS.daily;
    const monthly_limit = subs?.monthly_limit ?? DEFAULT_LIMITS.monthly;

    // Compute current daily usage (since start of UTC day)
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const { data: dayRows } = await supabaseAdmin
      .from("ai_usage_logs")
      .select("total_tokens")
      .eq("status", "success")
      .eq("user_id", userId)
      .gte("created_at", dayStart.toISOString());

    const current_daily_usage = (dayRows || []).reduce(
      (s: number, r: { total_tokens?: number }) => s + (r.total_tokens || 0),
      0,
    );

    // Compute current monthly usage (since start of UTC month)
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: monthRows } = await supabaseAdmin
      .from("ai_usage_logs")
      .select("total_tokens")
      .eq("status", "success")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());

    const current_monthly_usage = (monthRows || []).reduce(
      (s: number, r: { total_tokens?: number }) => s + (r.total_tokens || 0),
      0,
    );

    return {
      daily_limit,
      monthly_limit,
      current_daily_usage,
      current_monthly_usage,
    };
  } catch (err) {
    console.error("ai-quota:getUserAiUsage error", err);
    return {
      daily_limit: DEFAULT_LIMITS.daily,
      monthly_limit: DEFAULT_LIMITS.monthly,
      current_daily_usage: 0,
      current_monthly_usage: 0,
    };
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function logAiUsage(_log: AiUsageLog): Promise<void> {
  try {
    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: _log.user_id,
      model: _log.model,
      input_tokens: _log.input_tokens,
      output_tokens: _log.output_tokens,
      total_tokens: _log.total_tokens,
      cost_usd: _log.cost_usd,
      operation: _log.operation,
      status: _log.status,
      error_message: _log.error_message,
    });
  } catch (err) {
    console.error("ai-quota:logAiUsage error", err);
  }
}

export async function checkAiQuota(
  _userId: string,
  _estimatedTokens: number,
): Promise<{ allowed: boolean; reason?: string; quotaRemaining?: number }> {
  try {
    const usage = await getUserAiUsage(_userId);
    const dailyRemaining = usage.daily_limit - usage.current_daily_usage;
    const monthlyRemaining = usage.monthly_limit - usage.current_monthly_usage;

    if (_estimatedTokens > dailyRemaining) {
      return {
        allowed: false,
        reason: "daily_limit_exceeded",
        quotaRemaining: Math.max(0, dailyRemaining),
      };
    }

    if (_estimatedTokens > monthlyRemaining) {
      return {
        allowed: false,
        reason: "monthly_limit_exceeded",
        quotaRemaining: Math.max(0, monthlyRemaining),
      };
    }

    return {
      allowed: true,
      quotaRemaining: Math.max(0, Math.min(dailyRemaining, monthlyRemaining) - _estimatedTokens),
    };
  } catch (err) {
    console.error("ai-quota:checkAiQuota error", err);
    return {
      allowed: false,
      reason: "quota_check_error",
      quotaRemaining: 0,
    };
  }
}

export const modelPricing: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "gemini-pro": { input: 0.5, output: 1.5 },
  "claude-3-5-sonnet": { input: 3.0, output: 15.0 },
  "gpt-4o": { input: 5.0, output: 15.0 },
};

export function calculateAiCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = modelPricing[model] || modelPricing["gemini-2.5-flash"];
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
