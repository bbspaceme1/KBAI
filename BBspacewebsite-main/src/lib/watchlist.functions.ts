import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { priceAlertSchema, removeWatchlistSchema, watchlistItemSchema } from "@/lib/validation";

export async function getWatchlist() {
  const { supabase, userId } = await requireSupabaseAuth();
  const { data, error } = await supabase
    .from("watchlist")
    .select("id, ticker, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addToWatchlist(data: { ticker: string; note?: string }) {
  const { supabase, userId } = await requireSupabaseAuth();
  const validated = watchlistItemSchema.parse(data);
  const { error } = await supabase.from("watchlist").insert({
    user_id: userId,
    ticker: validated.ticker,
    note: data.note ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function removeFromWatchlist(data: { id: string }) {
  const { supabase, userId } = await requireSupabaseAuth();
  const validated = removeWatchlistSchema.parse(data);
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("id", validated.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
