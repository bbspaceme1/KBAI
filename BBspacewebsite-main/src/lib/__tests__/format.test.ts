import { describe, test, expect } from "vitest";
import { fmtIDR, fmtNum, fmtPct } from "../format";

describe("Format Utilities", () => {
  describe("fmtIDR", () => {
    test("formats numbers as Indonesian Rupiah", () => {
      expect(fmtIDR(1000)).toContain("1.000");
      expect(fmtIDR(1000000)).toContain("1.000.000");
      expect(fmtIDR(1500000)).toContain("1.500.000");
    });

    test("handles zero", () => {
      expect(fmtIDR(0)).toContain("0");
    });

    test("handles negative numbers", () => {
      const result = fmtIDR(-1000);
      expect(result).toContain("1.000");
    });

    test("handles large numbers", () => {
      expect(fmtIDR(10000000000)).toContain("10");
    });
  });

  describe("fmtNum", () => {
    test("formats numbers with thousand separators", () => {
      expect(fmtNum(1000)).toBe("1.000");
      expect(fmtNum(1000000)).toBe("1.000.000");
    });

    test("handles decimals", () => {
      const result = fmtNum(1000.5);
      expect(result).toContain("1.000");
    });

    test("handles zero", () => {
      expect(fmtNum(0)).toBe("0");
    });
  });

  describe("fmtPct", () => {
    test("formats percentage with 2 decimal places", () => {
      expect(fmtPct(0.05)).toContain("5");
      expect(fmtPct(0.1234)).toContain("12");
    });

    test("handles negative percentages", () => {
      const result = fmtPct(-0.05);
      expect(result).toContain("5");
    });

    test("handles zero percentage", () => {
      const result = fmtPct(0);
      expect(result).toContain("0");
    });

    test("handles large percentages", () => {
      const result = fmtPct(5.5);
      expect(result).toContain("5.50");
    });
  });
});
