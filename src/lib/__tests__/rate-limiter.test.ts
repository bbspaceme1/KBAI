import { describe, expect, it } from "vitest";
import { checkRateLimit, rateLimitMiddleware } from "@/lib/rate-limiter";

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

  it("keeps different authenticated users in separate buckets", async () => {
    const wrapped = rateLimitMiddleware((context) => context.userId ?? "")(async () => ({
      ok: true,
    }));

    for (let index = 0; index < 10; index += 1) {
      const response = await wrapped({ userId: "user-a" });
      expect(response).toEqual({ ok: true });
    }

    const rejected = await wrapped({ userId: "user-a" }).catch((error) => error);
    expect(rejected).toBeInstanceOf(Response);
    expect(rejected.status).toBe(429);

    const allowedForOtherUser = await wrapped({ userId: "user-b" });
    expect(allowedForOtherUser).toEqual({ ok: true });
  });

  it("rejects unresolvable identities with 401 instead of using a shared bucket", async () => {
    const wrapped = rateLimitMiddleware()(async () => ({ ok: true }));

    const error = await wrapped({}).catch((response) => response);
    expect(error).toBeInstanceOf(Response);
    expect(error.status).toBe(401);
  });
});
