import { describe, expect, it } from "vitest";
import { computeEmergencyFund } from "@/lib/emergency-fund-engine";

const input = (overrides: Record<string, unknown> = {}) => ({
  essentialMonthlyExpenses: 5_000_000,
  primaryIncomeSource: "employee",
  incomeStability: "stable",
  dependentBand: "0",
  debtStatus: "none",
  currentLiquidReserve: 20_000_000,
  physicalGoldValue: 0,
  ...overrides,
});

describe("computeEmergencyFund", () => {
  it("matches the strong reserve golden vector", () => {
    const result = computeEmergencyFund(input());
    expect(result.targetMonths).toBe(3);
    expect(result.targetFund).toBe(15_000_000);
    expect(result.coveragePercent).toBe(133.33);
    expect(result.level).toBe("strong_reserve");
    expect(result.fundingGap).toBe(0);
    expect(result.excessReserve).toBe(5_000_000);
  });
  it("keeps gold outside core coverage", () => {
    const result = computeEmergencyFund(
      input({
        currentLiquidReserve: 20_000_000,
        physicalGoldValue: 10_000_000,
        incomeStability: "irregular",
        dependentBand: "3+",
        debtStatus: "high_interest",
      }),
    );
    expect(result.coveragePercent).toBe(66.66);
    expect(result.level).toBe("vulnerable");
    expect(result.goldEquivalentMonths).toBe(2);
    expect(result.flags).toContain("HIGH_INTEREST_DEBT");
  });
  it("classifies exact thresholds without gaps", () => {
    expect(computeEmergencyFund(input({ currentLiquidReserve: 11_250_000 })).level).toBe(
      "near_target",
    );
    expect(computeEmergencyFund(input({ currentLiquidReserve: 15_000_000 })).level).toBe(
      "resilient",
    );
    expect(computeEmergencyFund(input({ currentLiquidReserve: 18_750_000 })).level).toBe(
      "strong_reserve",
    );
  });
  it("rejects invalid expenses", () => {
    expect(() => computeEmergencyFund(input({ essentialMonthlyExpenses: 0 }))).toThrow();
  });
});
