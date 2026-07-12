import { z } from "zod";
import { TOTP, Secret } from "otpauth";
import { getStartContext } from "@tanstack/start-storage-context";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { insertAuditLog } from "./audit.functions";
import { hashRecoveryCode, verifyRecoveryCode } from "./crypto.functions";
import { checkRateLimit, rateLimitMiddleware } from "@/lib/rate-limiter";

const ISSUER = "KBAI Terminal";

function buildTotp(secretBase32: string, label: string) {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const arr = new Uint8Array(5);
    crypto.getRandomValues(arr);
    codes.push(
      Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
        .match(/.{1,5}/g)!
        .join("-"),
    );
  }
  return codes;
}

export async function start2faSetup() {
  const { supabase, userId } = await requireSupabaseAuth();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? userId;
  const secret = new Secret({ size: 20 }).base32;
  const totp = buildTotp(secret, email);
  const otpauthUrl = totp.toString();

  // Upsert disabled record (will activate on verify)
  await supabaseAdmin
    .from("user_2fa")
    .upsert({ user_id: userId, secret, enabled: false }, { onConflict: "user_id" });

  return { secret, otpauth_url: otpauthUrl };
}

const limitVerify2fa = rateLimitMiddleware(async () => {
  const { userId } = await requireSupabaseAuth();
  return userId;
});

export const verify2fa = limitVerify2fa(async function verify2fa(data: { code: string }) {
  const { supabase, userId } = await requireSupabaseAuth();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? userId;
  const { data: row } = await supabaseAdmin
    .from("user_2fa")
    .select("secret, enabled")
    .eq("user_id", userId)
    .single();
  if (!row) throw new Error("Setup belum dimulai.");
  const totp = buildTotp(row.secret, email);
  const delta = totp.validate({ token: data.code, window: 1 });
  if (delta === null) throw new Error("Kode salah atau kadaluarsa.");

  // SEC-03: Generate plaintext recovery codes, hash them for storage
  const recoveryPlaintext = generateRecoveryCodes();
  const recoveryHashed = await Promise.all(recoveryPlaintext.map((code) => hashRecoveryCode(code)));

  await supabaseAdmin
    .from("user_2fa")
    .update({
      enabled: true,
      enrolled_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      recovery_codes: recoveryHashed, // Store hashes, not plaintext
    })
    .eq("user_id", userId);

  // Return plaintext codes to user (only shown once)
  return { ok: true, recovery_codes: recoveryPlaintext };
});

export async function disable2fa() {
  const { supabase, userId } = await requireSupabaseAuth();
  await supabaseAdmin.from("user_2fa").delete().eq("user_id", userId);
  return { ok: true };
}

export async function get2faStatus() {
  const { userId } = await requireSupabaseAuth();
  const { data } = await supabaseAdmin
    .from("user_2fa")
    .select("enabled, enrolled_at")
    .eq("user_id", userId)
    .maybeSingle();
  return { enabled: !!data?.enabled, enrolled_at: data?.enrolled_at ?? null };
}

function getClientIp(): string {
  const startContext = getStartContext({ throwIfNotFound: false });
  const request = startContext?.request;
  if (!request) return "unknown";

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp || "unknown";
}

/**
 * Verify recovery code during login
 * SEC-03: Recovery codes are now stored as hashes, verified with constant-time comparison
 * Returns true if code is valid, false otherwise
 * Note: Does NOT mark code as used (application layer should track this separately)
 */
export async function verifyRecoveryCodeForLogin(data: { userId: string; recovery_code: string }) {
    const { userId, recovery_code } = data;
    const clientIp = getClientIp();
    const ipRateLimit = await checkRateLimit(`recovery-code-ip:${clientIp}`);

    if (!ipRateLimit.allowed) {
      const resetIn = Math.ceil((ipRateLimit.resetTime - Date.now()) / 1000);
      throw new Response(`Rate limit exceeded. Try again in ${resetIn} seconds.`, {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": ipRateLimit.remaining.toString(),
          "X-RateLimit-Reset": ipRateLimit.resetTime.toString(),
          "Retry-After": resetIn.toString(),
        },
      });
    }

    const rateLimitWindow = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "auth.recovery_code_fail")
      .gte("created_at", rateLimitWindow);

    if (countError) {
      console.warn("Failed to read 2FA rate limit history:", countError.message);
    }

    if ((count ?? 0) >= 5) {
      throw new Error("Terlalu banyak percobaan gagal. Coba lagi dalam 1 jam.");
    }

    const { data: row } = await supabaseAdmin
      .from("user_2fa")
      .select("recovery_codes, enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (!row?.enabled || !row.recovery_codes || row.recovery_codes.length === 0) {
      return { ok: false, message: "2FA tidak diaktifkan atau recovery codes tidak tersedia" };
    }

    const hashedCodes = row.recovery_codes as string[];
    let matchedIndex = -1;

    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await verifyRecoveryCode(recovery_code, hashedCodes[i]);
      if (isValid) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      await insertAuditLog({
        user_id: userId,
        action: "auth.recovery_code_fail",
        metadata: { reason: "invalid recovery code" },
      });
      return { ok: false, message: "Recovery code tidak valid" };
    }

    const remainingCodes = hashedCodes.filter((_, i) => i !== matchedIndex);
    const { error: updateError } = await supabaseAdmin
      .from("user_2fa")
      .update({ recovery_codes: remainingCodes })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[2FA] Gagal invalidate recovery code:", updateError);
      return { ok: false, message: "Gagal memproses recovery code, coba lagi" };
    }

    return { ok: true, remaining_codes: remainingCodes.length };
  }

export const verify2faSetup = verify2fa;
