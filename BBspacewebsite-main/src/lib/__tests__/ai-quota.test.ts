import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { estimateTokens, calculateAiCost, type AiUsageLog } from "@/lib/ai-quota";
import { callAI } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("@/lib/ai-quota", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai-quota")>("@/lib/ai-quota");
  return {
    ...actual,
    checkAiQuota: vi.fn().mockResolvedValue({ allowed: true, quotaRemaining: 1000 }),
    logAiUsage: vi.fn().mockResolvedValue(undefined),
  };
});

describe("ai-quota helpers", () => {
  it("estimateTokens approximates token count", () => {
    const short = "hello world";
    const long = "a".repeat(4000);
    expect(estimateTokens(short)).toBeGreaterThanOrEqual(1);
    expect(estimateTokens(long)).toBeGreaterThan(900);
  });

  it("calculateAiCost returns number and scales with tokens", () => {
    const cost1 = calculateAiCost("gemini-2.5-flash", 1000, 2000);
    const cost2 = calculateAiCost("gemini-2.5-flash", 2000, 4000);
    const cost3 = calculateAiCost("gpt-4o", 1000, 1000);
    expect(typeof cost1).toBe("number");
    expect(cost2).toBeGreaterThanOrEqual(cost1);
    expect(cost3).toBeGreaterThanOrEqual(0);
  });
});

describe("callAI", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "hello" } }],
          usage: { prompt_tokens: 12, completion_tokens: 5 },
        }),
      }),
    );
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: true, error: null } as never);
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as never);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
    vi.unstubAllGlobals();
  });

  it("uses provider usage counts when logging AI usage", async () => {
    const { logAiUsage } = await import("@/lib/ai-quota");

    await callAI([{ role: "user", content: "Hello" }], {
      userId: "user-1",
      operation: "test",
      model: "gpt-4o",
    });

    expect(logAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        input_tokens: 12,
        output_tokens: 5,
        total_tokens: 17,
      }),
    );
  });
});
