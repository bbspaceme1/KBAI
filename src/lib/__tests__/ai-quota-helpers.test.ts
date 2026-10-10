import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fromMock, insertMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: fromMock },
}));

import { checkAiQuota, getUserAiUsage, logAiUsage } from "@/lib/ai-quota";

let subscription: { daily_limit: number; monthly_limit: number; status: string } | null;
let usageRows: Array<{ total_tokens: number }>;

function queryFor(table: string) {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.gte = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({ data: subscription, error: null }));
  query.insert = insertMock;
  query.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve({ data: table === "ai_usage_logs" ? usageRows : [], error: null }).then(
      resolve,
      reject,
    );
  return query;
}

describe("AI usage quota helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscription = null;
    usageRows = [];
    insertMock.mockResolvedValue({ data: null, error: null });
    fromMock.mockImplementation((table: string) => queryFor(table));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses subscription limits and sums successful daily/monthly usage", async () => {
    subscription = { daily_limit: 900, monthly_limit: 7000, status: "active" };
    usageRows = [{ total_tokens: 100 }, { total_tokens: 250 }];

    await expect(getUserAiUsage("user-a")).resolves.toEqual({
      daily_limit: 900,
      monthly_limit: 7000,
      current_daily_usage: 350,
      current_monthly_usage: 350,
    });

    expect(fromMock).toHaveBeenCalledWith("subscriptions");
    expect(fromMock).toHaveBeenCalledTimes(3);
  });

  it("uses default limits when there is no active subscription", async () => {
    await expect(getUserAiUsage("user-a")).resolves.toEqual({
      daily_limit: 5000,
      monthly_limit: 100000,
      current_daily_usage: 0,
      current_monthly_usage: 0,
    });
  });

  it("fails safely to default limits when a quota query throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fromMock.mockImplementationOnce(() => {
      throw new Error("database unavailable");
    });

    await expect(getUserAiUsage("user-a")).resolves.toEqual({
      daily_limit: 5000,
      monthly_limit: 100000,
      current_daily_usage: 0,
      current_monthly_usage: 0,
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("allows usage within both limits and returns the remaining quota", async () => {
    subscription = { daily_limit: 5000, monthly_limit: 100000, status: "active" };
    usageRows = [{ total_tokens: 100 }, { total_tokens: 50 }];

    await expect(checkAiQuota("user-a", 25)).resolves.toEqual({
      allowed: true,
      quotaRemaining: 4825,
    });
  });

  it("rejects usage over the daily limit", async () => {
    subscription = { daily_limit: 150, monthly_limit: 100000, status: "active" };
    usageRows = [{ total_tokens: 100 }, { total_tokens: 50 }];

    await expect(checkAiQuota("user-a", 1)).resolves.toEqual({
      allowed: false,
      reason: "daily_limit_exceeded",
      quotaRemaining: 0,
    });
  });

  it("rejects usage over the monthly limit", async () => {
    subscription = { daily_limit: 5000, monthly_limit: 100, status: "active" };
    usageRows = [{ total_tokens: 100 }, { total_tokens: 50 }];

    await expect(checkAiQuota("user-a", 1)).resolves.toEqual({
      allowed: false,
      reason: "monthly_limit_exceeded",
      quotaRemaining: 0,
    });
  });

  it("writes the complete usage record", async () => {
    const record = {
      user_id: "user-a",
      model: "gpt-4o",
      input_tokens: 10,
      output_tokens: 15,
      total_tokens: 25,
      cost_usd: 0.0001,
      operation: "research-summary",
      status: "success" as const,
      error_message: undefined,
    };

    await logAiUsage(record);

    expect(fromMock).toHaveBeenCalledWith("ai_usage_logs");
    expect(insertMock).toHaveBeenCalledWith(record);
  });

  it("does not throw if usage logging fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    insertMock.mockRejectedValueOnce(new Error("insert failed"));

    await expect(
      logAiUsage({
        user_id: "user-a",
        model: "gpt-4o",
        input_tokens: 1,
        output_tokens: 1,
        total_tokens: 2,
        cost_usd: 0,
        operation: "test",
        status: "error",
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
