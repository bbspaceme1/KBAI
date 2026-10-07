import { describe, expect, it } from "vitest";
import { toCsv } from "../csv-export";

describe("toCsv", () => {
  it("escapes RFC 4180 values and neutralizes spreadsheet formulas", () => {
    const csv = toCsv([
      {
        name: 'PT "ABC", Tbk',
        note: "line one\nline two",
        formula: "=SUM(A1)",
        empty: null,
      },
    ]);

    expect(csv).toBe('name,note,formula,empty\n"PT ""ABC"", Tbk","line one\nline two",\'=SUM(A1),');
  });

  it("serializes objects, unicode, and an empty dataset predictably", () => {
    expect(
      toCsv([{ symbol: "BBCA", metadata: { source: "IDX" }, label: "IHSG — Indonesia" }]),
    ).toBe('symbol,metadata,label\nBBCA,"{""source"":""IDX""}",IHSG — Indonesia');
    expect(toCsv([])).toBe("");
  });
});
