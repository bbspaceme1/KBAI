import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Simple in-memory fallback for local development.
const rateLimits = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

let redisRateLimiter: Ratelimit | null = null;

function getRedisRateLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  if (!redisRateLimiter) {
    redisRateLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${Math.round(WINDOW_MS / 1000)} s`),
      analytics: false,
      prefix: "kbai-rate-limit",
    });
  }

  return redisRateLimiter;
}

async function checkRateLimitInMemory(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const existing = rateLimits.get(identifier);

  if (!existing || now > existing.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetTime: now + WINDOW_MS };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }

  existing.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS - existing.count, resetTime: existing.resetTime };
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getRedisRateLimiter();

  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      const remaining = Math.max(0, result.remaining);
      return {
        allowed: result.success,
        remaining,
        resetTime: Date.now() + WINDOW_MS,
      };
    } catch (error) {
      console.warn("Upstash rate limiter failed, falling back to in-memory limiter", error);
    }
  }

  return checkRateLimitInMemory(identifier);
}

export function rateLimitMiddleware(
  identifierFn?: (context: { userId?: string }) => string | Promise<string>,
) {
  return function wrap<TArgs extends unknown[], TResult>(
    handler: (...args: TArgs) => Promise<TResult> | TResult,
  ) {
    return async (...args: TArgs): Promise<TResult> => {
      const context =
        args.find(
          (arg): arg is { userId?: string } =>
            typeof arg === "object" && arg !== null && "userId" in arg,
        ) ?? {};
      const identifier = identifierFn ? await identifierFn(context) : "anonymous";
      const { allowed, remaining, resetTime } = await checkRateLimit(identifier);

      if (!allowed) {
        const resetIn = Math.ceil((resetTime - Date.now()) / 1000);
        throw new Response(`Rate limit exceeded. Try again in ${resetIn} seconds.`, {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": resetTime.toString(),
            "Retry-After": resetIn.toString(),
          },
        });
      }

      const response = await handler(...args);

      if (response instanceof Response) {
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        response.headers.set("X-RateLimit-Reset", resetTime.toString());
      }

      return response;
    };
  };
}
