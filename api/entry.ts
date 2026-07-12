import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-expect-error - dist/server/index.js is generated at build time
import serverEntry from "../dist/server/index.js";
import { processMidtransNotification, verifyMidtransSignature } from "../src/lib/billing";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

// Simple in-process rate limiter for Node adapter (protects /api/* on Vercel)
const RL_WINDOW_MS = 60 * 1000; // 1 minute
const RL_MAX = 60; // 60 requests per minute per identifier
const rlMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimitNode(identifier: string) {
  const now = Date.now();
  const existing = rlMap.get(identifier);
  if (!existing || now > existing.resetTime) {
    rlMap.set(identifier, { count: 1, resetTime: now + RL_WINDOW_MS });
    return { allowed: true, remaining: RL_MAX - 1, resetTime: now + RL_WINDOW_MS };
  }

  if (existing.count >= RL_MAX) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }

  existing.count++;
  return { allowed: true, remaining: RL_MAX - existing.count, resetTime: existing.resetTime };
}

function getRequestUrl(req: IncomingMessage) {
  const host = req.headers.host ?? "localhost";
  const protocol = req.headers["x-forwarded-proto"] === "http" ? "http" : "https";
  return `${protocol}://${host}${req.url ?? "/"}`;
}

function setResponseHeaders(res: ServerResponse, response: Response) {
  // Add security headers
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.coingecko.com; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "frame-ancestors 'none';",
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      const existing = res.getHeader("Set-Cookie");
      if (!existing) {
        res.setHeader("Set-Cookie", value);
      } else {
        res.setHeader("Set-Cookie", ([] as string[]).concat(existing as string[]).concat(value));
      }
    } else if (!res.hasHeader(key)) {
      res.setHeader(key, value);
    }
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Health check endpoint: /api/health
    try {
      const url = new URL(getRequestUrl(req));
      if (req.method === "GET" && url.pathname === "/api/health") {
        try {
          const dbOk = await supabaseAdmin.from("profiles").select("id").limit(1);
          res.statusCode = dbOk.error ? 503 : 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: dbOk.error ? "degraded" : "ok",
              timestamp: new Date().toISOString(),
              version: process.env.npm_package_version || "unknown",
              uptime: process.uptime(),
            }),
          );
          return;
        } catch (e) {
          console.error("health check error", e);
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "error", error: String(e) }));
          return;
        }
      }
    } catch (e) {
      console.warn("health check handler error", e);
    }

    // Webhook endpoint: /api/midtrans-webhook
    try {
      const url = new URL(getRequestUrl(req));
      if (req.method === "POST" && url.pathname === "/api/midtrans-webhook") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        const signature = req.headers["x-midtrans-signature"] as string | undefined;

        if (!verifyMidtransSignature(raw, signature)) {
          res.statusCode = 400;
          res.end("Invalid signature");
          return;
        }

        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // Try form encoded
          const params = new URLSearchParams(raw);
          params.forEach((v, k) => {
            payload[k] = v;
          });
        }

        const orderId = String(payload.order_id || "");

        // IDEMPOTENCY CHECK: Verify if order was already processed
        if (orderId) {
          const { data: existingOrder } = await supabaseAdmin
            .from("subscriptions")
            .select("order_id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (existingOrder) {
            // Order already processed — return 200 but don't process again
            console.warn("webhook: order already processed", { orderId });
            res.statusCode = 200;
            res.end("Already processed");
            return;
          }
        }

        const result = await processMidtransNotification(payload);
        if (result.ok) {
          res.statusCode = 200;
          res.end("OK");
          return;
        }

        res.statusCode = 202;
        res.end(`Accepted: ${result.reason}`);
        return;
      }
    } catch (e) {
      console.warn("midtrans webhook handler error", e);
    }
    // Rate limiting: identify by user header, authorization, or IP
    const forwarded = req.headers["x-forwarded-for"] as string | undefined;
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "unknown";
    const userIdHeader = (req.headers["x-user-id"] as string) || (req.headers["x-uid"] as string);
    const auth = (req.headers["authorization"] as string) || undefined;
    const identifier = userIdHeader || auth || ip || "anonymous";

    const rl = checkRateLimitNode(identifier);
    if (!rl.allowed) {
      const resetIn = Math.ceil((rl.resetTime - Date.now()) / 1000);
      res.statusCode = 429;
      res.setHeader("Retry-After", String(resetIn));
      res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
      res.setHeader("X-RateLimit-Reset", String(rl.resetTime));
      res.end(`Rate limit exceeded. Try again in ${resetIn} seconds.`);
      return;
    }
    // Buffer the request body for non-GET/HEAD requests
    let body: BodyInit | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }

    const request = new Request(getRequestUrl(req), {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: body,
    });

    const response = await serverEntry.fetch(request, undefined, undefined);
    setResponseHeaders(res, response);
    res.statusCode = response.status;

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
