import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyRecoveryCodeForLogin } from "@/lib/twofa.functions";
import { getStartContext } from "@tanstack/start-storage-context";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { insertAuditLog } from "@/lib/audit.functions";
import { checkRateLimit } from "@/lib/rate-limiter";
import { verifyRecoveryCode } from "@/lib/crypto.functions";

vi.mock("@/integrations/supabase/client.server", async () => {
  const actual = await vi.importActual<typeof import("@/integrations/supabase/client.server")>(
    "@/integrations/supabase/client.server",
  );
  return {
    ...actual,
    supabaseAdmin: {
      from: vi.fn(),
    },
  };
});

vi.mock("@/lib/rate-limiter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limiter")>("@/lib/rate-limiter");
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

vi.mock("@tanstack/start-storage-context", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/start-storage-context")>(
    "@tanstack/start-storage-context",
  );
  return {
    ...actual,
    getStartContext: vi.fn(),
  };
});

vi.mock("./audit.functions", async () => ({
  insertAuditLog: vi.fn(),
}));

vi.mock("./crypto.functions", async () => ({
  hashRecoveryCode: vi.fn(),
  verifyRecoveryCode: vi.fn(),
}));

describe("verifyRecoveryCodeForLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStartContext).mockReturnValue({
      request: new Request("https://example.com/auth/recovery", {
        headers: { "x-forwarded-for": "203.0.113.9" },
      }),
    } as never);
    vi.mocked(verifyRecoveryCode).mockResolvedValue(false);
    vi.mocked(insertAuditLog).mockResolvedValue(undefined as never);
  });

  it("blocks repeated failed attempts for the same user after the DB-backed threshold is reached", async () => {
    let auditCount = 0;
    const fromMock = vi.mocked(supabaseAdmin.from);
    const checkLimitMock = vi.mocked(checkRateLimit);

    checkLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60_000,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockImplementation(async () => {
            const result = { count: auditCount, error: null };
            return result;
          }),
        } as never;
      }

      if (table === "user_2fa") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { enabled: true, recovery_codes: ["hashed-code"] },
          }),
        } as never;
      }

      throw new Error(`Unexpected table ${table}`);
    });

    for (let index = 0; index < 5; index += 1) {
      await expect(
        verifyRecoveryCodeForLogin({ userId: "victim-1", recovery_code: "bad-code" }),
      ).resolves.toMatchObject({ ok: false, message: "Recovery code tidak valid" });
      auditCount += 1;
    }

    await expect(
      verifyRecoveryCodeForLogin({ userId: "victim-1", recovery_code: "bad-code" }),
    ).rejects.toThrow("Terlalu banyak percobaan gagal");
  });

  it("does not let rotating userIds bypass IP-based rate limiting", async () => {
    const checkLimitMock = vi.mocked(checkRateLimit);
    const fromMock = vi.mocked(supabaseAdmin.from);
    let callCount = 0;

    checkLimitMock.mockImplementation(async () => {
      callCount += 1;
      const allowed = callCount <= 5;
      return {
        allowed,
        remaining: allowed ? 5 - callCount : 0,
        resetTime: Date.now() + 60_000,
      };
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
        } as never;
      }

      if (table === "user_2fa") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { enabled: true, recovery_codes: ["hashed-code"] },
          }),
        } as never;
      }

      throw new Error(`Unexpected table ${table}`);
    });

    for (let index = 0; index < 5; index += 1) {
      await expect(
        verifyRecoveryCodeForLogin({ userId: `victim-${index}`, recovery_code: "bad-code" }),
      ).resolves.toMatchObject({ ok: false, message: "Recovery code tidak valid" });
    }

    await expect(
      verifyRecoveryCodeForLogin({ userId: "victim-6", recovery_code: "bad-code" }),
    ).rejects.toThrow("Rate limit exceeded");
  });
});
