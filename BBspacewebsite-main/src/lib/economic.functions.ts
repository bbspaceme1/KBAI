import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export async function listEconomicEvents(
  data: { from?: string; to?: string; country?: string } = {},
) {
  await requireSupabaseAuth();
  let q = supabase
    .from("economic_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true })
    .limit(500);
  if (data.from) q = q.gte("event_date", data.from);
  if (data.to) q = q.lte("event_date", data.to);
  if (data.country) q = q.eq("country", data.country);
  const { data: rows, error } = await q;
  if (error) throw error;
  return rows ?? [];
}

export async function listMacroIndicators(data: { country?: string; indicator: string }) {
  await requireSupabaseAuth();
  const country = data.country ?? "IDN";
  const { data: rows, error } = await supabase
    .from("macro_indicators")
    .select("period, value, unit, source")
    .eq("country", country)
    .eq("indicator", data.indicator)
    .order("period", { ascending: true })
    .limit(500);
  if (error) throw error;
  return rows ?? [];
}

export async function ingestFredSeries(_data: {
  series_id: string;
  indicator: string;
  country?: string;
  unit?: string;
}): Promise<{ inserted: number }> {
  throw new Error("ingestFredSeries requires server runtime; not available in SPA mode.");
}
