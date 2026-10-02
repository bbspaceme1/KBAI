import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, fromMock, eqMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  fromMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: authMock,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: fromMock },
}));

import {
  calculateAlpha,
  calculateDrawdownFromSeries,
  calculateTwrFromSeries,
  calculateXirrFromFlows,
  getPortfolioPerformanceSummary,
} from "@/lib/performance-engine.functions";

describe("performance engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "session-user" });
    fromMock.mockImplementation((table: string) => {
      const data =
        table === "portfolio_snapshots"
          ? [
              { date: "2026-01-01", total_value: 100 },
              { date: "2026-02-01", total_value: 110 },
            ]
          : table === "benchmark_base100_series"
            ? [{ normalized_value: 105 }]
            : [];
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          eqMock(...args);
          return query;
        },
        gte: () => query,
        lte: () => query,
        order: async () => ({ data, error: null }),
      };
      return query;
    });
  });

  it("geometrically links TWR sub-periods around a cash flow", () => {
    expect(
      calculateTwrFromSeries(
        [
          { date: "2026-01-01", total_value: 100 },
          { date: "2026-02-01", total_value: 220 },
          { date: "2026-03-01", total_value: 242 },
        ],
        [{ flow_date: "2026-02-01", amount: 100 }],
      ),
    ).toBeCloseTo(0.32, 8);
  });
  it("calculates a textbook-style XIRR", () => {
    expect(
      calculateXirrFromFlows([
        { date: "2025-01-01", amount: -1000 },
        { date: "2026-01-01", amount: 1100 },
      ]),
    ).toBeCloseTo(0.1, 4);
  });
  it("calculates peak-to-trough drawdown", () => {
    expect(calculateDrawdownFromSeries([100, 120, 90, 110])).toEqual({
      maxDrawdown: 0.25,
      currentDrawdown: 0.08333333333333333,
    });
  });
  it("returns alpha as the excess return", () => expect(calculateAlpha(0.2, 0.1)).toBeCloseTo(0.1));
  it("handles insufficient data", () => {
    expect(calculateTwrFromSeries([{ date: "2026-01-01", total_value: 100 }], [])).toBeNull();
    expect(calculateXirrFromFlows([{ date: "2026-01-01", amount: -100 }])).toBeNull();
    expect(calculateAlpha(null, 0.1)).toBeNull();
  });

  it("scopes portfolio reads to the authenticated session, not a supplied user id", async () => {
    const request = {
      fromDate: "2026-01-01",
      toDate: "2026-02-01",
      userId: "attacker-selected-user",
    };

    await getPortfolioPerformanceSummary(request);

    expect(eqMock).toHaveBeenCalledWith("user_id", "session-user");
    expect(eqMock).not.toHaveBeenCalledWith("user_id", "attacker-selected-user");
  });

  it("rejects invalid date ranges before querying portfolio data", async () => {
    await expect(
      getPortfolioPerformanceSummary({ fromDate: "2026-02-01", toDate: "2026-01-01" }),
    ).rejects.toThrow("fromDate must be on or before toDate");
    expect(fromMock).not.toHaveBeenCalled();
  });
});
