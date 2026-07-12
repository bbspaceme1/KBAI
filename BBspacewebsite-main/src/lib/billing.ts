import crypto from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  const status = asString(payload.transaction_status || payload.status_code || payload.status);
  const orderId = asString(payload.order_id || payload.orderId);
  const grossAmount = Number(payload.gross_amount || payload.grossAmount || payload.amount || 0);
  const transactionTime =
    asString(payload.transaction_time || payload.transactionTime) || new Date().toISOString();

  // Try to extract user id from payload or order id
  let userId = payload.user_id || payload.userId;
  if (!userId && typeof orderId === "string") {
    const parts = orderId.split("_");
    // If order format: order_{userId}_{nonce}
    if (parts.length >= 3 && parts[0] === "order") {
      userId = parts[1];
    }
  }

  if (!userId) {
    // Log and skip if we don't know which user
    console.warn("billing: cannot determine user for order", orderId);
    return { ok: false, reason: "unknown_user" };
  }

  // Map amount to tier using extracted function
  const { tier, durationDays } = mapAmountToTier(grossAmount);

  if (String(status).toLowerCase() === "settlement" || String(status) === "200") {
    const startsAt = new Date(transactionTime);
    const endsAt = new Date(startsAt);
    endsAt.setUTCDate(endsAt.getUTCDate() + durationDays);

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        tier,
        status: "active",
        payment_gateway: "midtrans",
        order_id: orderId,
        started_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: now,
        created_at: now,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(`billing: subscription upsert failed: ${error.message}`);
    }

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
    return hash === signature;
  } catch (err) {
    console.warn("billing: signature verification failed", err);
    return false;
  }
}
