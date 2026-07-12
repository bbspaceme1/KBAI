import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { priceAlertSchema } from "@/lib/validation";

export async function listNotifications() {
  const { userId } = await requireSupabaseAuth();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, metadata, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(data: { id?: string; all?: boolean }) {
  const { userId } = await requireSupabaseAuth();
  const now = new Date().toISOString();
  const q = supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);
  const { error } = data.all ? await q : await q.eq("id", data.id!);
  if (error) throw error;
  return { ok: true };
}

export async function listPriceAlerts() {
  const { userId } = await requireSupabaseAuth();
  const { data, error } = await supabase
    .from("price_alerts")
    .select("id, ticker, condition, threshold, is_active, triggered_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPriceAlert(data: {
  ticker: string;
  condition: "above" | "below";
  threshold: number;
}) {
  const { userId } = await requireSupabaseAuth();
  const validated = priceAlertSchema.parse(data);
  const { error } = await supabase.from("price_alerts").insert({
    user_id: userId,
    ticker: validated.ticker,
    condition: validated.condition,
    threshold: validated.threshold,
  });
  if (error) throw error;
  return { ok: true };
}

export async function deletePriceAlert(data: { id: string }) {
  const { userId } = await requireSupabaseAuth();
  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", data.id)
    .eq("user_id", userId);
  if (error) throw error;
  return { ok: true };
}
