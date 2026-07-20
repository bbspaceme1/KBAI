import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimitNode } from "@/lib/rate-limiter";

/**
 * POST /api/access-request
 * Rate-limited endpoint for public access request submissions
 * - Rate limit: 5 requests per IP per 24 hours
 * - Validation: email format, field lengths, spam patterns
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract IP address for rate limiting
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : req.socket?.remoteAddress || "unknown";
  const rateLimitKey = `access-request:${ip}`;

  // Rate limit: 5 requests per IP per 24 hours
  const rl = checkRateLimitNode(rateLimitKey, {
    maxRequests: 5,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  });

  if (!rl.allowed) {
    return res.status(429).json({
      error: "Terlalu banyak permintaan. Coba lagi dalam 24 jam.",
      retryAfter: rl.retryAfter,
    });
  }

  try {
    const { full_name, email, investment_background, source_referral, additional_info } = req.body;

    // Server-side validation
    if (!full_name || !email) {
      return res.status(400).json({ error: "Nama dan email harus diisi" });
    }

    if (full_name.length > 100) {
      return res.status(400).json({ error: "Nama terlalu panjang" });
    }

    if (additional_info && additional_info.length > 1000) {
      return res.status(400).json({ error: "Informasi tambahan terlalu panjang" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }

    // Spam pattern detection: check for excessive URLs or suspicious content
    const suspiciousPatterns = /(http|https|ftp):\/\/|click here|buy now|limited time/gi;
    if (suspiciousPatterns.test(full_name) || suspiciousPatterns.test(additional_info || "")) {
      return res.status(400).json({ error: "Konten mencurigakan terdeteksi" });
    }

    // Check for duplicate recent submissions from same email (within 24 hours)
    const { data: recent } = await supabaseAdmin
      .from("access_requests")
      .select("id")
      .eq("email", email)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return res.status(400).json({
        error: "Permintaan dengan email ini sudah dikirim dalam 24 jam terakhir",
      });
    }

    // Insert request into database
    const { error } = await supabaseAdmin.from("access_requests").insert({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      investment_background,
      source_referral,
      additional_info: (additional_info || "").trim(),
      status: "pending",
      ip_address: ip,
      user_agent: req.headers["user-agent"] || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[access-request] DB error:", error);
      return res.status(500).json({ error: "Gagal menyimpan permintaan" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[access-request] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
