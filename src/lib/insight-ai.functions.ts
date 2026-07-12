import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "@/lib/ai-gateway";
import { rateLimitMiddleware } from "@/lib/rate-limiter";

async function requireAdvisor() {
  const { userId } = await requireSupabaseAuth();
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const rs = (roles ?? []).map((r) => String(r.role));
  if (!rs.includes("admin") && !rs.includes("advisor")) {
    throw new Error("Forbidden: admin or advisor role required");
  }
  return userId;
}

const limitInsightAi = rateLimitMiddleware(async () => {
  return await requireAdvisor();
});

export const generateAiInsight = limitInsightAi(async function generateAiInsight() {
  const userId = await requireAdvisor();
  const [{ data: profiles }, { data: holdings }, { data: cash }, { data: prices }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id, username"),
      supabaseAdmin.from("holdings").select("*").gt("total_lot", 0),
      supabaseAdmin.from("cash_balances").select("user_id, balance"),
      supabaseAdmin
        .from("eod_prices")
        .select("ticker, close, date")
        .order("date", { ascending: false })
        .limit(5000),
    ]);

  const priceMap = new Map<string, number>();
  for (const p of prices ?? [])
    if (!priceMap.has(p.ticker)) priceMap.set(p.ticker, Number(p.close));
  const userMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
  const cashMap = new Map((cash ?? []).map((c) => [c.user_id, Number(c.balance)]));

  const userAgg = new Map<
    string,
    {
      username: string;
      positions: { ticker: string; value: number; cost: number; lot: number }[];
      total_value: number;
      total_cost: number;
      cash: number;
    }
  >();
  for (const h of holdings ?? []) {
    const last = priceMap.get(h.ticker) ?? Number(h.avg_price);
    const value = last * h.total_lot * 100;
    const cost = Number(h.avg_price) * h.total_lot * 100;
    const cur = userAgg.get(h.user_id) ?? {
      username: userMap.get(h.user_id) ?? h.user_id.slice(0, 8),
      positions: [],
      total_value: 0,
      total_cost: 0,
      cash: cashMap.get(h.user_id) ?? 0,
    };
    cur.positions.push({ ticker: h.ticker, value, cost, lot: h.total_lot });
    cur.total_value += value;
    cur.total_cost += cost;
    userAgg.set(h.user_id, cur);
  }

  const anonymizedUsers = Array.from(userAgg.values()).map((u, i) => {
    const categorize = (v: number) =>
      v < 50_000_000 ? "< 50M" : v < 500_000_000 ? "50M-500M" : "> 500M";
    return {
      user_id: `USER_${i + 1}`,
      positions_count: u.positions.length,
      total_value_tier: categorize(u.total_value),
      cash_ratio: u.cash / (u.total_value + u.cash),
      pl_pct: u.total_cost > 0 ? ((u.total_value - u.total_cost) / u.total_cost) * 100 : 0,
      top_sectors: u.positions
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((p) => p.ticker),
    };
  });

  const communityAgg = new Map<string, number>();
  for (const u of userAgg.values())
    for (const p of u.positions)
      communityAgg.set(p.ticker, (communityAgg.get(p.ticker) ?? 0) + p.value);
  const communityTotal = Array.from(communityAgg.values()).reduce((s, v) => s + v, 0);
  const topCommunity = Array.from(communityAgg.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t, v]) => ({
      ticker: t,
      value: Math.round(v),
      pct: communityTotal > 0 ? +((v / communityTotal) * 100).toFixed(2) : 0,
    }));

  const payload = {
    community: {
      total_value: Math.round(communityTotal),
      total_users: anonymizedUsers.length,
      top_concentrations: topCommunity,
    },
    users: anonymizedUsers,
  };

  const systemPrompt = `Kamu adalah analis investasi senior untuk komunitas KBAI (IDX). Berikan insight strategis dalam Bahasa Indonesia, padat dan actionable, dalam markdown.`;
  const userPrompt = `Data internal:\n\n${JSON.stringify(payload, null, 2)}`;

  type LovableAiResponse = {
    data?: { choices?: { message?: { content?: string } }[] };
    choices?: { message?: { content?: string } }[];
  };

  const aiJson = await callLovableAi<LovableAiResponse>(
    {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    { userId },
  );
  const content =
    aiJson.data?.choices?.[0]?.message?.content ??
    aiJson.choices?.[0]?.message?.content ??
    "(no response)";
  return {
    content,
    generated_at: new Date().toISOString(),
    users_analyzed: anonymizedUsers.length,
  };
});
