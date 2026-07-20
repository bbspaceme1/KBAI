import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { authedMiddleware } from "@/lib/with-auth";
import { insertAuditLog } from "@/lib/audit.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAccess } from "@/lib/rbac";

// ============================================
// AUDIT LOGS — DUP-03: Consolidated implementation
// ============================================
export async function writeAuditLog(data: {
  username?: string;
  action: string;
  entity?: string;
  entity_id?: string;
  metadata?: Record<string, Json>;
  user_agent?: string;
}) {
  // For SPA mode, we need to get user from auth context
  const { supabase, userId } = await requireSupabaseAuth();
  await insertAuditLog({
    ...data,
    user_id: userId,
  });
  return { ok: true };
}

export async function adminListAuditLogs(
  data: {
    limit?: number;
    action?: string;
    user_id?: string;
  } = {},
) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  let q = supabaseAdmin
    .from("audit_logs")
    .select(
      "id, user_id, username, action, entity, entity_id, metadata, ip_address, user_agent, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(data.limit || 200);
  if (data.action) q = q.eq("action", data.action);
  if (data.user_id) q = q.eq("user_id", data.user_id);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function recordSession(data: {
  username?: string;
  device_label?: string;
  user_agent?: string;
}) {
  const { supabase, userId } = await requireSupabaseAuth();

  if (data.user_agent) {
    await supabaseAdmin
      .from("user_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("user_agent", data.user_agent)
      .eq("is_active", true);
  }
  const { data: row, error } = await supabaseAdmin
    .from("user_sessions")
    .insert({
      user_id: userId,
      username: data.username ?? null,
      device_label: data.device_label ?? null,
      user_agent: data.user_agent ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { session_id: row.id };
}

export async function adminListSessions(
  data: {
    only_active?: boolean;
    limit?: number;
  } = {},
) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  let q = supabaseAdmin
    .from("user_sessions")
    .select(
      "id, user_id, username, device_label, user_agent, ip_address, is_active, last_seen_at, created_at, ended_at",
    )
    .order("last_seen_at", { ascending: false })
    .limit(data.limit || 200);
  if (data.only_active) q = q.eq("is_active", true);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function adminRevokeSession(data: { session_id: string }) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  // First, get the session to find the target user
  const { data: session, error: fetchError } = await supabaseAdmin
    .from("user_sessions")
    .select("user_id, id")
    .eq("id", data.session_id)
    .single();
  if (fetchError || !session) throw new Error("Session not found");

  const targetUserId = session.user_id;

  // Mark session as revoked in tracking table
  const { error: updateError } = await supabaseAdmin
    .from("user_sessions")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("id", data.session_id);
  if (updateError) throw new Error(updateError.message);

  // Attempt to sign out user globally via Supabase Admin API
  // This invalidates all refresh tokens for the user, forcing re-authentication
  try {
    await supabaseAdmin.auth.admin.signOut(targetUserId);
    await insertAuditLog({
      action: "admin.revoke_session",
      user_id: userId,
      entity: "user_session",
      entity_id: data.session_id,
      metadata: { target_user_id: targetUserId, method: "auth_admin_signout" },
    });
  } catch (err) {
    // Log error but don't fail the operation — session is already marked revoked
    console.warn("[admin] Failed to sign out user via Supabase Admin API:", err);
    await insertAuditLog({
      action: "admin.revoke_session",
      user_id: userId,
      entity: "user_session",
      entity_id: data.session_id,
      metadata: {
        target_user_id: targetUserId,
        method: "tracking_only",
        warning: "auth_signout_failed",
      },
    });
  }

  return { ok: true };
}

// ============================================
// AI USAGE LOGS ADMIN
// ============================================
export async function adminListAiUsageLogs(
  data: { limit?: number; user_id?: string; since?: string } = {},
) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  let q = supabaseAdmin
    .from("ai_usage_logs")
    .select(
      "id, user_id, model, input_tokens, output_tokens, total_tokens, cost_usd, operation, status, error_message, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(data.limit || 200);
  if (data.user_id) q = q.eq("user_id", data.user_id);
  if (data.since) q = q.gte("created_at", data.since);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function adminAiUsageSummary(data: { days?: number } = {}) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  const days = data.days ?? 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const { data: rows, error } = await supabaseAdmin
    .from("ai_usage_logs")
    .select("user_id, total_tokens, cost_usd, created_at")
    .gte("created_at", since.toISOString());
  if (error) throw new Error(error.message);
  const summary = {
    total_tokens: 0,
    total_cost: 0,
    by_user: {} as Record<string, { tokens: number; cost: number }>,
  };
  type Row = {
    user_id?: string | null;
    total_tokens?: number | string;
    cost_usd?: number | string;
  };
  (rows || []).forEach((r: Row) => {
    summary.total_tokens += Number(r.total_tokens || 0);
    summary.total_cost += Number(r.cost_usd || 0);
    const uid = r.user_id || "unknown";
    if (!summary.by_user[uid]) summary.by_user[uid] = { tokens: 0, cost: 0 };
    summary.by_user[uid].tokens += Number(r.total_tokens || 0);
    summary.by_user[uid].cost += Number(r.cost_usd || 0);
  });
  return summary;
}

// ============================================
// SYSTEM SETTINGS
// ============================================
export async function adminListSystemSettings() {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  const { data: rows, error } = await supabaseAdmin
    .from("system_settings")
    .select("key, value, updated_at")
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function adminUpdateSystemSetting(data: { key: string; value: Json }) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  const { error } = await supabaseAdmin.from("system_settings").upsert(
    {
      key: data.key,
      value: data.value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ============================================
// SMF / Reksadana scraping (pasardana.id)
// ============================================
export async function adminGetMutualFundNav(data: { fund_id?: string } = {}) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  // Pasardana exposes a public chart JSON endpoint
  const url = `https://pasardana.id/api/Fund/GetFundNavData?id=${data.fund_id || "2057"}&period=1Y`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 KBAITerminal/1.0",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { ok: false, error: `pasardana returned ${res.status}`, data: [] };
    }
    const json = (await res.json()) as Array<{ Date: string; Nav: number }> | { data?: unknown };
    const arr = Array.isArray(json)
      ? json
      : Array.isArray((json as { data?: unknown }).data)
        ? (json as { data: Array<{ Date: string; Nav: number }> }).data
        : [];
    return {
      ok: true,
      count: arr.length,
      data: arr.slice(-30).map((r) => ({ date: r.Date?.slice(0, 10), nav: r.Nav })),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "fetch failed",
      data: [],
    };
  }
}

// Aliases for backward compatibility
export const adminListSettings = adminListSystemSettings;
export const adminUpdateSetting = adminUpdateSystemSetting;
export const fetchSmfNav = adminGetMutualFundNav;
