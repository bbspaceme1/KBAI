import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function findEntitlement(userId: string, featureCode: string) {
  const db = supabaseAdmin as any;
  const { data, error } = await db.from("company_subscriptions").select("plan_id").eq("user_id", userId).in("status", ["paid", "active"]).or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`).maybeSingle();
  if (error || !data) return null;
  const { data: entitlement, error: entitlementError } = await db.from("plan_entitlements").select("limit_value, features!inner(feature_code)").eq("plan_id", data.plan_id).eq("features.feature_code", featureCode).maybeSingle();
  return entitlementError || !entitlement ? null : entitlement;
}

export async function hasEntitlement(userId: string, featureCode: string) {
  return (await findEntitlement(userId, featureCode)) !== null;
}

export async function getEntitlementLimit(userId: string, featureCode: string): Promise<number | null> {
  const entitlement = await findEntitlement(userId, featureCode);
  return entitlement?.limit_value == null ? null : Number(entitlement.limit_value);
}

export async function getFinanceKpis() {
  const db = supabaseAdmin as any;
  const month = new Date();
  const firstDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const [{ data: revenue }, { data: active }] = await Promise.all([
    db.from("revenue_records").select("amount").gte("recognized_date", firstDay),
    db.from("company_subscriptions").select("plan_id").eq("status", "active"),
  ]);
  const planIds = (active ?? []).map((row: { plan_id: string }) => row.plan_id);
  const { data: plans } = planIds.length ? await db.from("plans").select("id,price_annual").in("id", planIds) : { data: [] };
  return {
    revenueThisMonth: (revenue ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0),
    activeSubscriptionCount: active?.length ?? 0,
    mrrApproximation: (plans ?? []).reduce((sum: number, row: { price_annual: number }) => sum + Number(row.price_annual) / 12, 0),
  };
}
