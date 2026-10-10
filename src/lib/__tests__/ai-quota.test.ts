import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  estimateTokens,
  calculateAiCost,
  getUserAiUsage,
  checkAiQuota,
  logAiUsage,
  type AiUsageLog,
} from "@/lib/ai-quota";
import { callAI } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const userSupabaseRpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: vi.fn().mockResolvedValue({
    userId: "session-user",
    supabase: { rpc: userSupabaseRpc },
  }),
}));

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

function createQuery(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.gte = vi.fn(() => Promise.resolve(result));
  query.maybeSingle = vi.fn(() => Promise.resolve(result));
  query.insert = vi.fn(() => Promise.resolve(result));
  return query;
}

describe("database-backed AI quota helpers", () => {
  it("aggregates subscription limits and daily/monthly usage", async () => {
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(
        createQuery({ data: { daily_limit: 1000, monthly_limit: 5000 }, error: null }) as never,
      )
      .mockReturnValueOnce(
        createQuery({ data: [{ total_tokens: 10 }, { total_tokens: 20 }], error: null }) as never,
      )
      .mockReturnValueOnce(
        createQuery({ data: [{ total_tokens: 50 }, { total_tokens: 100 }], error: null }) as never,
      );

    await expect(getUserAiUsage("session-user")).resolves.toEqual({
      daily_limit: 1000,
      monthly_limit: 5000,
      current_daily_usage: 30,
      current_monthly_usage: 150,
    });
  });

  it("uses documented defaults when no subscription exists", async () => {
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(createQuery({ data: null, error: null }) as never)
      .mockReturnValueOnce(createQuery({ data: [], error: null }) as never)
      .mockReturnValueOnce(createQuery({ data: [], error: null }) as never);

    await expect(getUserAiUsage("session-user")).resolves.toEqual({
      daily_limit: 5000,
      monthly_limit: 100000,
      current_daily_usage: 0,
      current_monthly_usage: 0,
    });
  });

  it("fails closed when usage lookup errors", async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
      createQuery({ data: null, error: { message: "database unavailable" } }) as never,
    );

    await expect(getUserAiUsage("session-user")).rejects.toThrow("database unavailable");
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
      createQuery({ data: null, error: { message: "database unavailable" } }) as never,
    );
    await expect(checkAiQuota("session-user", 1)).resolves.toMatchObject({
      allowed: false,
      reason: "quota_check_error",
      quotaRemaining: 0,
    });
  });

  it("enforces daily and monthly quota limits", async () => {
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(
        createQuery({ data: { daily_limit: 10, monthly_limit: 100 }, error: null }) as never,
      )
      .mockReturnValueOnce(createQuery({ data: [{ total_tokens: 9 }], error: null }) as never)
      .mockReturnValueOnce(createQuery({ data: [{ total_tokens: 9 }], error: null }) as never);
    await expect(checkAiQuota("session-user", 2)).resolves.toMatchObject({
      allowed: false,
      reason: "daily_limit_exceeded",
      quotaRemaining: 1,
    });

    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(
        createQuery({ data: { daily_limit: 100, monthly_limit: 10 }, error: null }) as never,
      )
      .mockReturnValueOnce(createQuery({ data: [{ total_tokens: 1 }], error: null }) as never)
      .mockReturnValueOnce(createQuery({ data: [{ total_tokens: 9 }], error: null }) as never);
    await expect(checkAiQuota("session-user", 2)).resolves.toMatchObject({
      allowed: false,
      reason: "monthly_limit_exceeded",
      quotaRemaining: 1,
    });
  });

  it("allows requests within both limits and logs usage", async () => {
    vi.mocked(supabaseAdmin.from)
      .mockReturnValueOnce(
        createQuery({ data: { daily_limit: 100, monthly_limit: 1000 }, error: null }) as never,
      )
      .mockReturnValueOnce(createQuery({ data: [{ total_tokens: 10 }], error: null }) as never)
      .mockReturnValueOnce(createQuery({ data: [{ total_tokens: 50 }], error: null }) as never);
    await expect(checkAiQuota("session-user", 5)).resolves.toMatchObject({
      allowed: true,
      quotaRemaining: 85,
    });

    const insertQuery = createQuery({ data: null, error: null });
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce(insertQuery as never);
    const log: AiUsageLog = {
      user_id: "session-user",
      model: "gpt-4o",
      input_tokens: 10,
      output_tokens: 5,
      total_tokens: 15,
      cost_usd: 0.01,
      operation: "test",
      status: "success",
    };
    await logAiUsage(log);
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining(log));
  });

  it("uses fallback pricing for unknown models", () => {
    expect(calculateAiCost("unknown-model", 1000, 1000)).toBeGreaterThan(0);
    expect(estimateTokens("")).toBe(0);
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
    userSupabaseRpc.mockReset();
    userSupabaseRpc.mockImplementation(async (functionName: string) => {
      if (functionName === "reserve_ai_quota") return { data: "reservation-id", error: null };
      if (functionName === "finalize_ai_quota_reservation") return { data: true, error: null };
      return { data: null, error: null };
    });
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

  it("reserves quota for the session user and finalizes actual provider usage", async () => {
    await callAI([{ role: "user", content: "Hello" }], {
      userId: "user-1",
      operation: "test",
      model: "gpt-4o",
    });

    expect(userSupabaseRpc).toHaveBeenCalledWith(
      "reserve_ai_quota",
      expect.objectContaining({ p_user: "session-user", p_tokens: expect.any(Number) }),
    );
    expect(userSupabaseRpc).toHaveBeenCalledWith(
      "finalize_ai_quota_reservation",
      expect.objectContaining({
        p_reservation_id: "reservation-id",
        p_model: "gpt-4o",
        p_input_tokens: 12,
        p_output_tokens: 5,
        p_status: "success",
      }),
    );
  });

  it("fails closed when atomic quota enforcement is unavailable", async () => {
    userSupabaseRpc.mockImplementation(async (functionName: string) =>
      functionName === "reserve_ai_quota"
        ? { data: null, error: { message: "RPC unavailable" } }
        : { data: true, error: null },
    );

    await expect(
      callAI([{ role: "user", content: "Hello" }], { operation: "test", model: "gpt-4o" }),
    ).rejects.toThrow("AI quota enforcement unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks provider calls when quota reservation is denied", async () => {
    userSupabaseRpc.mockImplementation(async (functionName: string) =>
      functionName === "reserve_ai_quota"
        ? { data: null, error: null }
        : { data: true, error: null },
    );

    await expect(
      callAI([{ role: "user", content: "Hello" }], { operation: "test", model: "gpt-4o" }),
    ).rejects.toThrow("daily_limit_exceeded");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not use a client-supplied user id for quota enforcement", async () => {
    await callAI([{ role: "user", content: "Hello" }], {
      userId: "attacker-selected-user",
      operation: "test",
      model: "gpt-4o",
    });

    expect(userSupabaseRpc).toHaveBeenCalledWith(
      "reserve_ai_quota",
      expect.objectContaining({ p_user: "session-user" }),
    );
    expect(userSupabaseRpc).not.toHaveBeenCalledWith(
      "reserve_ai_quota",
      expect.objectContaining({ p_user: "attacker-selected-user" }),
    );
  });
});
