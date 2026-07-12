import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { insertAuditLog } from "@/lib/audit.functions";

type UserRoleRow = { role: string };

export async function softDeleteUser(): Promise<{ ok: boolean }> {
  const { userId } = await requireSupabaseAuth();

  const now = new Date().toISOString();

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ deleted_at: now })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`failed to soft delete profile: ${profileError.message}`);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: `deleted_${userId}@deleted.kbai.id`,
    password: Math.random().toString(36).slice(2, 18),
    user_metadata: { deleted: true },
    email_confirm: true,
  });

  if (authError) {
    throw new Error(`failed to anonymize auth profile: ${authError.message}`);
  }

  await insertAuditLog({
    action: "user.soft_delete",
    metadata: { userId, deleted_at: now },
  });

  return { ok: true };
}

export async function exportUserData(): Promise<Record<string, unknown>> {
  const { userId } = await requireSupabaseAuth();

  const [profileRes, transactionsRes, holdingsRes, watchlistRes, alertsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", userId).single(),
    supabaseAdmin.from("transactions").select("*").eq("user_id", userId),
    supabaseAdmin.from("holdings").select("*").eq("user_id", userId),
    supabaseAdmin.from("watchlists").select("*").eq("user_id", userId),
    supabaseAdmin.from("price_alerts").select("*").eq("user_id", userId),
  ]);

  if (profileRes.error) throw new Error(`failed to export profile: ${profileRes.error.message}`);
  if (transactionsRes.error)
    throw new Error(`failed to export transactions: ${transactionsRes.error.message}`);
  if (holdingsRes.error) throw new Error(`failed to export holdings: ${holdingsRes.error.message}`);
  if (watchlistRes.error)
    throw new Error(`failed to export watchlists: ${watchlistRes.error.message}`);
  if (alertsRes.error) throw new Error(`failed to export price alerts: ${alertsRes.error.message}`);

  return {
    exported_at: new Date().toISOString(),
    profile: profileRes.data,
    transactions: transactionsRes.data,
    holdings: holdingsRes.data,
    watchlists: watchlistRes.data,
    price_alerts: alertsRes.data,
  };
}

export async function restoreUser(_data: { userId: string }): Promise<{ ok: boolean }> {
  const { userId: caller } = await requireSupabaseAuth();
  const target = _data.userId;
  if (!target) throw new Error("target userId required");

  // If caller is not the same user, ensure caller is admin
  if (caller !== target) {
    const { data: roles } = await supabaseAdmin
      .from<UserRoleRow>("user_roles")
      .select("role")
      .eq("user_id", caller);
    const rs = (roles ?? []).map((r) => r.role);
    if (!rs.includes("admin"))
      throw new Error("Forbidden: admin role required to restore other users");
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", target);
  if (profileError) throw new Error(`failed to restore profile: ${profileError.message}`);

  try {
    await supabaseAdmin.auth.admin.updateUserById(target, {
      user_metadata: { deleted: false },
    });
  } catch (err) {
    console.warn("restoreUser: failed to update auth metadata", err);
  }

  await insertAuditLog({ action: "user.restore", metadata: { target } });
  return { ok: true };
}

export async function permanentlyDeleteUser(_data: { userId: string }): Promise<{ ok: boolean }> {
  const { userId: caller } = await requireSupabaseAuth();
  const target = _data.userId;
  if (!target) throw new Error("target userId required");

  if (caller !== target) {
    const { data: roles } = await supabaseAdmin
      .from<UserRoleRow>("user_roles")
      .select("role")
      .eq("user_id", caller);
    const rs = (roles ?? []).map((r) => r.role);
    if (!rs.includes("admin"))
      throw new Error("Forbidden: admin role required to permanently delete other users");
  }

  const tables = [
    "transactions",
    "holdings",
    "watchlists",
    "price_alerts",
    "portfolio_snapshots",
    "subscriptions",
    "user_roles",
    "ai_usage_logs",
  ];

  for (const t of tables) {
    try {
      await supabaseAdmin.from(t).delete().eq("user_id", target);
    } catch (err) {
      console.warn(`permanentlyDeleteUser: error deleting from ${t}`, err);
    }
  }

  try {
    await supabaseAdmin.from("profiles").delete().eq("id", target);
  } catch (err) {
    console.warn("permanentlyDeleteUser: error deleting profile", err);
  }

  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(target);
  if (deleteErr) throw new Error(`failed to delete auth user: ${deleteErr.message}`);

  await insertAuditLog({ action: "user.permanently_delete", metadata: { target } });
  return { ok: true };
}

export async function archiveOldData(
  _data: { daysOld?: number } = {},
): Promise<{ ok: boolean; deleted: Record<string, number> }> {
  const { userId } = await requireSupabaseAuth();
  const { data: roles } = await supabaseAdmin
    .from<UserRoleRow>("user_roles")
    .select("role")
    .eq("user_id", userId);
  const rs = (roles ?? []).map((r) => r.role);
  if (!rs.includes("admin")) throw new Error("Forbidden: admin role required");

  const daysOld = Number(_data.daysOld ?? 90);
  if (!Number.isFinite(daysOld) || daysOld <= 0)
    throw new Error("daysOld must be a positive number");

  const threshold = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
  const tables = [
    { name: "ai_usage_logs", column: "created_at" },
    { name: "price_alerts", column: "created_at" },
  ];

  const deleted: Record<string, number> = {};
  for (const { name, column } of tables) {
    const resp = await supabaseAdmin
      .from(name)
      .delete()
      .lt(column, threshold)
      .select("id", { count: "exact" });
    if (resp.error) throw new Error(`archiveOldData failed for ${name}: ${resp.error.message}`);
    deleted[name] = resp.count ?? 0;
  }

  await insertAuditLog({ action: "user.archive_old_data", metadata: { daysOld, deleted } });
  return { ok: true, deleted };
}
