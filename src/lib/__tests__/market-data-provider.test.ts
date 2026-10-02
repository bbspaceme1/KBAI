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
});
