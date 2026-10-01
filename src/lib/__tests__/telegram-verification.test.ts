import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const { authMock, fromMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: authMock,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: fromMock },
}));

import {
  validateTelegramLogin,
  verifyTelegramMembership,
} from "@/lib/telegram-verification.server";

describe("Telegram login validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockRejectedValue(new Error("Authentication required"));
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-bot-token");
    vi.stubEnv("TELEGRAM_LOGIN_MAX_AGE_SECONDS", "86400");
  });

  it("accepts a fresh Telegram Login payload with a valid hash", () => {
    const payload = {
      id: "123",
      auth_date: String(Math.floor(Date.now() / 1000)),
      username: "investor",
    };
    const check = Object.entries(payload)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secret = createHash("sha256").update("test-bot-token").digest();
    const hash = createHash("sha256").update(secret).update(check).digest("hex");

    expect(validateTelegramLogin({ ...payload, hash })).toMatchObject({
      telegramUserId: 123,
      username: "investor",
    });
  });

  it("rejects tampered or expired payloads", () => {
    expect(validateTelegramLogin({ id: "123", auth_date: "1", hash: "00" })).toBeNull();
    expect(
      validateTelegramLogin({
        id: "123",
        auth_date: String(Math.floor(Date.now() / 1000)),
        hash: "00",
      }),
    ).toBeNull();
  });

  it("requires a server session before querying Telegram memberships", async () => {
    await expect(verifyTelegramMembership(123)).rejects.toThrow("Authentication required");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects invalid Telegram user ids before querying memberships", async () => {
    authMock.mockResolvedValueOnce({ userId: "session-user" });

    await expect(verifyTelegramMembership(Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow();
    expect(fromMock).not.toHaveBeenCalled();
  });
});
