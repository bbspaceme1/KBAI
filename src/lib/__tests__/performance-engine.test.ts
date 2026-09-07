import { describe, expect, it } from "vitest";
import { calculateAlpha, calculateDrawdownFromSeries, calculateTwrFromSeries, calculateXirrFromFlows } from "@/lib/performance-engine.functions";

describe("performance engine", () => {
  it("geometrically links TWR sub-periods around a cash flow", () => {
    expect(calculateTwrFromSeries([
      { date: "2026-01-01", total_value: 100 },
      { date: "2026-02-01", total_value: 220 },
      { date: "2026-03-01", total_value: 242 },
    ], [{ flow_date: "2026-02-01", amount: 100 }])).toBeCloseTo(0.32, 8);
  });
  it("calculates a textbook-style XIRR", () => {
    expect(calculateXirrFromFlows([
      { date: "2025-01-01", amount: -1000 },
      { date: "2026-01-01", amount: 1100 },
    ])).toBeCloseTo(0.1, 4);
  });
  it("calculates peak-to-trough drawdown", () => {
    expect(calculateDrawdownFromSeries([100, 120, 90, 110])).toEqual({ maxDrawdown: 0.25, currentDrawdown: 0.08333333333333333 });
  });
  it("returns alpha as the excess return", () => expect(calculateAlpha(0.2, 0.1)).toBeCloseTo(0.1));
  it("handles insufficient data", () => {
    expect(calculateTwrFromSeries([{ date: "2026-01-01", total_value: 100 }], [])).toBeNull();
    expect(calculateXirrFromFlows([{ date: "2026-01-01", amount: -100 }])).toBeNull();
    expect(calculateAlpha(null, 0.1)).toBeNull();
  });
});
