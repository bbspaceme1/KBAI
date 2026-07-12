import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limiter";

describe("rate limiter", () => {
  it("rejects the eleventh request within a 60-second window", async () => {
    const identifier = `test-${Date.now()}-${Math.random()}`;

    for (let index = 0; index < 10; index += 1) {
      const result = await checkRateLimit(identifier);
      expect(result.allowed).toBe(true);
    }

    const blocked = await checkRateLimit(identifier);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
