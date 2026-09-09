import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateTelegramLogin, verifyTelegramMembership } from "@/lib/telegram-verification.server";

const bodySchema = z.object({
  telegram_login: z.record(z.string(), z.string()).optional(),
});

export const Route = createFileRoute("/api/telegram/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let auth;
        try {
          auth = await requireSupabaseAuth();
        } catch {
          return Response.json({ status: "UNAUTHORIZED", website_access: false }, { status: 401 });
        }
        const db = supabaseAdmin as any;
        const rateKey = `user:${auth.userId}`;
        const { data: allowed } = await db.rpc("consume_telegram_verification_rate_limit", { p_rate_key: rateKey, p_limit: 5, p_window_seconds: 60 });
        if (allowed === false) return Response.json({ status: "RATE_LIMITED", action: "RETRY", website_access: false }, { status: 429 });
        const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success || !parsed.data.telegram_login) return Response.json({ status: "INVALID_REQUEST", website_access: false }, { status: 400 });
        const identity = validateTelegramLogin(parsed.data.telegram_login);
        if (!identity) return Response.json({ status: "INVALID_TELEGRAM_AUTH", website_access: false }, { status: 401 });
        const { error: userError } = await db.from("telegram_users").upsert({ user_id: auth.userId, telegram_user_id: identity.telegramUserId, username: identity.username, first_name: identity.firstName, last_name: identity.lastName, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (userError) return Response.json({ status: "ERROR", action: "RETRY", website_access: false }, { status: 502 });
        const result = await verifyTelegramMembership(auth.userId, identity.telegramUserId);
        return Response.json(result, { status: result.status === "ERROR" ? 502 : 200 });
      },
    },
  },
});
