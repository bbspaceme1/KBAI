import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { validateTelegramLogin } from "@/lib/telegram-verification.server";

describe("Telegram login validation", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-bot-token");
    vi.stubEnv("TELEGRAM_LOGIN_MAX_AGE_SECONDS", "86400");
  });

  it("accepts a fresh Telegram Login payload with a valid hash", () => {
    const payload = { id: "123", auth_date: String(Math.floor(Date.now() / 1000)), username: "investor" };
    const check = Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
    const secret = createHash("sha256").update("test-bot-token").digest();
    const hash = createHash("sha256").update(secret).update(check).digest("hex");

    expect(validateTelegramLogin({ ...payload, hash })).toMatchObject({ telegramUserId: 123, username: "investor" });
  });

  it("rejects tampered or expired payloads", () => {
    expect(validateTelegramLogin({ id: "123", auth_date: "1", hash: "00" })).toBeNull();
    expect(validateTelegramLogin({ id: "123", auth_date: String(Math.floor(Date.now() / 1000)), hash: "00" })).toBeNull();
  });
});
