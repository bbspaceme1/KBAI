import { describe, expect, test } from "vitest";
import { priceAlertSchema, watchlistItemSchema } from "../validation";

describe("validation schemas", () => {
  test("price alerts accept alphanumeric ticker codes", () => {
    const parsed = priceAlertSchema.parse({
      ticker: "A1",
      condition: "above",
      threshold: 1000,
    });

    expect(parsed.ticker).toBe("A1");
  });

  test("watchlist items accept alphanumeric ticker codes", () => {
    const parsed = watchlistItemSchema.parse({
      ticker: "BBCA1",
    });

    expect(parsed.ticker).toBe("BBCA1");
  });
});
