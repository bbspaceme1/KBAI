import { describe, test, expect } from "vitest";
import { computeHoldingsFromTxns } from "../portfolio.functions";

describe("computeHoldingsFromTxns", () => {
  test("BUY increases holdings", () => {
    const result = computeHoldingsFromTxns([{ ticker: "BBCA", side: "BUY", lot: 10, price: 9000 }]);
    expect(result).toEqual([
      {
        ticker: "BBCA",
        total_lot: 10,
        avg_price: 9000,
      },
    ]);
  });

  test("SELL reduces holdings correctly", () => {
    const result = computeHoldingsFromTxns([
      { ticker: "BBCA", side: "BUY", lot: 10, price: 9000 },
      { ticker: "BBCA", side: "SELL", lot: 5, price: 10000 },
    ]);
    expect(result).toEqual([
      {
        ticker: "BBCA",
        total_lot: 5,
        avg_price: 9000, // avg_price unchanged on SELL
      },
    ]);
  });

  test("SELL all removes from holdings", () => {
    const result = computeHoldingsFromTxns([
      { ticker: "BBCA", side: "BUY", lot: 10, price: 9000 },
      { ticker: "BBCA", side: "SELL", lot: 10, price: 10000 },
    ]);
    expect(result).toHaveLength(0);
  });

  test("Multiple BUY transactions average correctly", () => {
    const result = computeHoldingsFromTxns([
      { ticker: "BBCA", side: "BUY", lot: 10, price: 9000 },
      { ticker: "BBCA", side: "BUY", lot: 10, price: 10000 },
    ]);
    expect(result).toEqual([
      {
        ticker: "BBCA",
        total_lot: 20,
        avg_price: 9500, // (10*9000 + 10*10000) / 20
      },
    ]);
  });

  test("SELL more than available removes holding", () => {
    // When selling more than available, holding is removed (lot becomes 0)
    const result = computeHoldingsFromTxns([
      { ticker: "BBCA", side: "BUY", lot: 10, price: 9000 },
      { ticker: "BBCA", side: "SELL", lot: 15, price: 10000 },
    ]);
    expect(result).toEqual([]); // Holding removed when lot <= 0
  });

  test("Multiple tickers handled separately", () => {
    const result = computeHoldingsFromTxns([
      { ticker: "BBCA", side: "BUY", lot: 10, price: 9000 },
      { ticker: "TLKM", side: "BUY", lot: 5, price: 3000 },
      { ticker: "BBCA", side: "SELL", lot: 5, price: 9500 },
    ]);
    expect(result).toHaveLength(2);
    const bbca = result.find((r) => r.ticker === "BBCA");
    const tlkm = result.find((r) => r.ticker === "TLKM");
    expect(bbca).toEqual({ ticker: "BBCA", total_lot: 5, avg_price: 9000 });
    expect(tlkm).toEqual({ ticker: "TLKM", total_lot: 5, avg_price: 3000 });
  });
});
