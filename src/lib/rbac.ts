import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function requireRole(userId: string, role: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const roles = (data ?? []).map((row) => String(row.role));
  if (!roles.includes(role)) {
    throw new Error(`Forbidden: ${role} role required`);
  }

  return userId;
}

export async function requireAdminAccess(userId?: string): Promise<string> {
  if (!userId) {
    const auth = await requireSupabaseAuth();
    userId = auth.userId;
  }

  if (!userId) {
    throw new Error("Unauthorized: user not authenticated");
  }

  return requireRole(userId, "admin");
}
