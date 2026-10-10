import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMarketQuotes } from "@/lib/market-data-provider";

describe("market data provider configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails closed instead of requesting data from an unofficial fallback", async () => {
    vi.stubEnv("MARKET_DATA_API_URL", "");
    vi.stubEnv("MARKET_DATA_API_KEY", "");
    vi.stubEnv("SECTORS_API_KEY", "configured-test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMarketQuotes(["BBCA.JK"])).rejects.toThrow(
      "No official market data provider configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });


describe("official market data response contracts", () => {
  beforeEach(() => {
    vi.stubEnv("MARKET_DATA_API_URL", "https://idx.example/");
    vi.stubEnv("MARKET_DATA_API_KEY", "test-key");
  });

  it("parses object quote responses and sends the configured bearer key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { BBCA: 100, TLKM: { price: 200 }, INVALID: { price: "300" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMarketQuotes(["BBCA", "TLKM", "INVALID"])).resolves.toEqual({
      BBCA: 100,
      TLKM: 200,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://idx.example/quotes?symbols=BBCA%2CTLKM%2CINVALID",
      { headers: { Accept: "application/json", Authorization: "Bearer test-key" } },
    );
  });

  it("parses array quote responses and rejects non-OK provider responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ symbol: "BBCA", price: 100 }, { symbol: "TLKM", price: 200 }],
    }));
    await expect(fetchMarketQuotes(["BBCA"])).resolves.toEqual({ BBCA: 100, TLKM: 200 });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchMarketQuotes(["BBCA"])).rejects.toThrow("All market data providers failed");
  });

  it("parses chart data arrays and timestamp/close arrays", async () => {
    const { fetchMarketChart } = await import("@/lib/market-data-provider");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ date: "2026-10-09", close: "123.5" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ timestamps: [1791504000, 1791590400], closes: [100, null] }) }));

    await expect(fetchMarketChart("BBCA", 1, 2)).resolves.toEqual([
      { date: "2026-10-09", close: 123.5 },
    ]);
    await expect(fetchMarketChart("BBCA", 1, 2)).resolves.toEqual([
      { date: new Date(1791504000 * 1000).toISOString().slice(0, 10), close: 100 },
    ]);
  });

  it("returns quote detail with previous close, percent change and currency", async () => {
    const { fetchMarketQuoteDetail } = await import("@/lib/market-data-provider");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { BBCA: 120 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ date: "2000-01-01", close: 100 }] }) }));

    await expect(fetchMarketQuoteDetail("BBCA")).resolves.toMatchObject({
      price: 120,
      previousClose: 100,
      pctChange: 20,
      currency: "IDR",
    });
  });

  it("returns null when a quote is absent and rejects invalid response shapes", async () => {
    const { fetchMarketQuoteDetail } = await import("@/lib/market-data-provider");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    }));
    await expect(fetchMarketQuoteDetail("BBCA")).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: true }),
    }));
    await expect(fetchMarketQuotes(["BBCA"])).rejects.toThrow("All market data providers failed");
  });
});
});
