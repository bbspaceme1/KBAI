import { describe, expect, it, vi } from "vitest";
import {
  buildIdxUrl,
  deriveStockMetrics,
  fetchIdxPaginated,
  fetchIdxStockSummary,
  idxEndpoints,
} from "../idx-bei";

describe("IDX-BEI acquisition contract", () => {
  it("derives metrics without confusing them with raw fields", () => {
    expect(
      deriveStockMetrics({
        Previous: 100,
        Close: 110,
        Volume: 10,
        Value: 1050,
        ForeignBuy: 8,
        ForeignSell: 3,
        ListedShares: 1000,
      }),
    ).toEqual({
      return: 0.1,
      vwap: 105,
      netForeignFlow: 5,
      marketCap: 110000,
    });
  });

  it("handles missing and zero denominators safely", () => {
    expect(
      deriveStockMetrics({
        Previous: 0,
        Close: 10,
        Volume: 0,
        Value: 100,
        ForeignBuy: null,
        ForeignSell: 2,
        ListedShares: null,
      }),
    ).toEqual({
      return: null,
      vwap: null,
      netForeignFlow: null,
      marketCap: null,
    });
  });

  it("builds official IDX query URLs", () => {
    const url = buildIdxUrl(idxEndpoints.stockSummary, {
      date: "20260807",
      start: 0,
      length: 500,
    });
    expect(url).toContain("/primary/TradingSummary/GetStockSummary");
    expect(url).toContain("date=20260807");
  });

  it("fetches every page using IDX record metadata", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ StockCode: "AAA" }], recordsFiltered: 2, recordsTotal: 2 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ StockCode: "BBB" }], recordsFiltered: 2, recordsTotal: 2 }),
          { status: 200 },
        ),
      );

    const result = await fetchIdxPaginated(
      "/TradingSummary/GetStockSummary",
      { date: "20260807" },
      fetcher,
      1,
    );

    expect(result.data).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][0])).toContain("start=1");
  });

  it("rejects malformed upstream payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 }));
    await expect(fetchIdxStockSummary("20260807", fetcher)).rejects.toThrow("data array");
  });
});
