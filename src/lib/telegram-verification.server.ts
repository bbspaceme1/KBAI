import { createHash, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TelegramMembershipState = "ACTIVE" | "LEFT" | "ERROR";
export type TelegramVerificationResult =
  | { status: "CHANNEL_REQUIRED"; action: "CONTACT_ADMIN"; contact_admin_url: string | null; website_access: false }
  | { status: "GROUPS_REQUIRED"; action: "SHOW_GROUP_INVITES"; missing_groups: Array<{ chatId: number; title: string; inviteUrl: string | null }>; website_access: false }
  | { status: "VERIFIED"; website_access: true; admin_status: "member Telegram" }
  | { status: "ERROR"; action: "RETRY"; website_access: false };

function telegramApiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot configuration is missing");
  return `https://api.telegram.org/bot${token}/${method}`;
}

export function validateTelegramLogin(payload: Record<string, string>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !payload.id || !payload.auth_date || !payload.hash) return null;
  const receivedHash = payload.hash;
  const dataCheckString = Object.entries(payload)
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expectedHash = createHash("sha256").update(secret).update(dataCheckString).digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  const maxAge = Number(process.env.TELEGRAM_LOGIN_MAX_AGE_SECONDS ?? 86400);
  if (Math.abs(Date.now() / 1000 - Number(payload.auth_date)) > maxAge) return null;
  return { telegramUserId: Number(payload.id), username: payload.username ?? null, firstName: payload.first_name ?? null, lastName: payload.last_name ?? null };
}

async function getChatMember(chatId: number, userId: number): Promise<TelegramMembershipState> {
  try {
    const response = await fetch(telegramApiUrl("getChatMember"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: userId }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return "ERROR";
    const body = (await response.json()) as { ok: boolean; result?: { status?: string } };
    if (!body.ok || !body.result?.status) return "ERROR";
    return ["creator", "administrator", "member", "restricted"].includes(body.result.status) ? "ACTIVE" : "LEFT";
  } catch {
    return "ERROR";
  }
}

export async function verifyTelegramMembership(userId: string, telegramUserId: number): Promise<TelegramVerificationResult> {
  const db = supabaseAdmin as any;
  const { data: chats, error } = await db.from("telegram_chats").select("telegram_chat_id,title,is_master_gate,is_required,admin_contact_url,invite_link").eq("is_active", true).order("is_master_gate", { ascending: false });
  if (error || !chats?.length) return { status: "ERROR", action: "RETRY", website_access: false };
  const master = chats.find((chat: any) => chat.is_master_gate);
  if (!master) return { status: "ERROR", action: "RETRY", website_access: false };
  const masterState = await getChatMember(master.telegram_chat_id, telegramUserId);
  if (masterState === "ERROR") return { status: "ERROR", action: "RETRY", website_access: false };
  if (masterState !== "ACTIVE") {
    await persistVerification(userId, telegramUserId, "CHANNEL_REQUIRED", false, "CHANNEL_LEFT");
    return { status: "CHANNEL_REQUIRED", action: "CONTACT_ADMIN", contact_admin_url: master.admin_contact_url ?? process.env.ADMIN_CONTACT_URL ?? null, website_access: false };
  }
  const missingGroups: Array<{ chatId: number; title: string; inviteUrl: string | null }> = [];
  for (const chat of chats.filter((candidate: any) => !candidate.is_master_gate && candidate.is_required)) {
    const state = await getChatMember(chat.telegram_chat_id, telegramUserId);
    if (state === "ERROR") return { status: "ERROR", action: "RETRY", website_access: false };
    if (state !== "ACTIVE") missingGroups.push({ chatId: chat.telegram_chat_id, title: chat.title, inviteUrl: chat.invite_link ?? null });
  }
  if (missingGroups.length) {
    await persistVerification(userId, telegramUserId, "GROUPS_REQUIRED", false, "GROUPS_MISSING");
    return { status: "GROUPS_REQUIRED", action: "SHOW_GROUP_INVITES", missing_groups: missingGroups, website_access: false };
  }
  await persistVerification(userId, telegramUserId, "VERIFIED", true, null);
  return { status: "VERIFIED", website_access: true, admin_status: "member Telegram" };
}

async function persistVerification(userId: string, telegramUserId: number, status: string, websiteAccess: boolean, reason: string | null) {
  const db = supabaseAdmin as any;
  await db.from("telegram_verifications").upsert({ user_id: userId, telegram_user_id: telegramUserId, verification_status: status, website_access: websiteAccess, admin_status: websiteAccess ? "member Telegram" : null, verified_at: websiteAccess ? new Date().toISOString() : null, revoked_at: websiteAccess ? null : new Date().toISOString(), revocation_reason: reason, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  await db.from("telegram_verification_events").insert({ user_id: userId, telegram_user_id: telegramUserId, event_type: websiteAccess ? "WEBSITE_ACCESS_GRANTED" : status === "CHANNEL_REQUIRED" ? "CHANNEL_MISSING" : "GROUPS_MISSING", metadata: reason ? { reason } : {} });
}
