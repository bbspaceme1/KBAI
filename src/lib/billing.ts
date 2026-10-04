import crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { constantTimeEqual } from "@/lib/crypto.functions";

type MidtransNotificationPayload = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

/**
 * Map billing amount (IDR) to subscription tier and duration
 * @param grossAmount Amount in IDR
 * @returns Object with tier and durationDays
 */
export function mapAmountToTier(grossAmount: number): { tier: string; durationDays: number } {
  const ENTERPRISE_THRESHOLD = 1_000_000; // IDR 1,000,000/year
  const PRO_THRESHOLD = 100_000; // IDR 100,000/month

  if (grossAmount >= ENTERPRISE_THRESHOLD) {
    return { tier: "enterprise", durationDays: 365 };
  }
  if (grossAmount >= PRO_THRESHOLD) {
    return { tier: "pro", durationDays: 30 };
  }
  return { tier: "free", durationDays: 0 };
}

/**
 * Simple billing helper that processes Midtrans-like notifications.
 * Expected `order_id` format: "order_{userId}_{random}" or supply `user_id` in payload.
 */
export async function processMidtransNotification(payload: MidtransNotificationPayload) {
  // Billing tables are introduced by the Company Operations migration; regenerate Supabase types before removing this compatibility cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const status = asString(payload.transaction_status || payload.status_code || payload.status);
  const orderId = asString(payload.order_id || payload.orderId);
  const grossAmount = Number(payload.gross_amount || payload.grossAmount || payload.amount || 0);
  const transactionTime =
    asString(payload.transaction_time || payload.transactionTime) || new Date().toISOString();

  const orderParts = orderId.split("_");
  const userId = orderParts[0] === "order" ? orderParts[1] : "";
  const userIdPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!userIdPattern.test(userId)) {
    console.warn("billing: order does not contain a valid server-bound user id", orderId);
    return { ok: false, reason: "invalid_order_owner" };
  }

  if (String(status).toLowerCase() === "settlement" || String(status) === "200") {
    const { data: plan, error: planError } = await db
      .from("plans")
      .select("id, price_annual")
      .eq("is_active", true)
      .eq("price_annual", grossAmount)
      .maybeSingle();

    if (planError) throw new Error(`billing: plan lookup failed: ${planError.message}`);
    if (!plan) return { ok: false, reason: "amount_does_not_match_active_plan" };

    const startsAt = new Date(transactionTime);
    const expiresAt = new Date(startsAt);
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    const now = new Date().toISOString();

    const { data: subscription, error: subscriptionError } = await db
      .from("company_subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_id: plan.id,
          status: "active",
          started_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (subscriptionError || !subscription) {
      throw new Error(
        `billing: company subscription upsert failed: ${subscriptionError?.message ?? "missing subscription"}`,
      );
    }

    const { error: paymentError } = await db.from("payments").upsert(
      {
        subscription_id: subscription.id,
        amount: grossAmount,
        currency: "IDR",
        status: "paid",
        payment_method: "midtrans",
        external_reference: orderId,
        paid_at: startsAt.toISOString(),
      },
      { onConflict: "external_reference" },
    );

    if (paymentError) throw new Error(`billing: payment upsert failed: ${paymentError.message}`);
    return { ok: true, userId, orderId };
  }

  console.warn(`billing: transaction not settled ${status}`, { orderId, userId });
  return { ok: false, reason: "status_not_settled" };
}

export function verifyMidtransSignature(body: string, signatureHeader?: string) {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) {
    console.warn("billing: MIDTRANS_SERVER_KEY is not configured, cannot verify signature");
    return false;
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(body);
  } catch {
    const params = new URLSearchParams(body);
    payload = Object.fromEntries(params.entries());
  }

  const orderId = String(payload.order_id || payload.orderId || "");
  const statusCode = String(payload.status_code || payload.statusCode || payload.status || "");
  const grossAmount = String(payload.gross_amount || payload.grossAmount || payload.amount || "");
  const signature = signatureHeader || String(payload.signature_key || payload.signature || "");

  if (!orderId || !statusCode || !grossAmount || !signature) {
    console.warn("billing: missing Midtrans signature fields", {
      orderId,
      statusCode,
      grossAmount,
      signatureHeader,
    });
    return false;
  }

  try {
    const hash = crypto
      .createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${key}`)
      .digest("hex");
    return constantTimeEqual(hash, signature);
  } catch (err) {
    console.warn("billing: signature verification failed", err);
    return false;
  }
}
