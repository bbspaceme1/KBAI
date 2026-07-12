import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getCommunityPortfolioStats(data: { from_date: string }) {
  const { supabase, userId } = await requireSupabaseAuth();

  // IMP-05: Fix data model - aggregate portfolio_snapshots per date instead of using kbai_index
  // Returns: Equity (total market value), Holdings (total cost basis), P/L (unrealized)
  const { data: snapshots, error } = await supabaseAdmin
    .from("portfolio_snapshots")
    .select("date, total_value, total_cost, total_pl")
    .gte("date", data.from_date)
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);

  if (!snapshots || snapshots.length === 0) {
    return [];
  }

  // Group by date and sum across all users
  const byDate = new Map<string, { value: number; cost: number; pl: number }>();
  for (const snap of snapshots) {
    const key = snap.date;
    const cur = byDate.get(key) ?? { value: 0, cost: 0, pl: 0 };
    cur.value += Number(snap.total_value || 0);
    cur.cost += Number(snap.total_cost || 0);
    cur.pl += Number(snap.total_pl || 0);
    byDate.set(key, cur);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      Equity: v.value, // total market value (AUM)
      Holdings: v.cost, // total cost basis
      "P/L": v.pl, // unrealized P/L
    }));
}

export async function getCommunityEquitySeries(_data: { from_date: string }): Promise<unknown[]> {
  return [];
}
