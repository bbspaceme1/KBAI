// SPA-compatible auth helper. Returns { supabase, userId, claims } using the
// browser Supabase client on the client side, and validates Bearer tokens on the
// server side using the Supabase service role client.
import { supabase } from "./client";
import { supabaseAdmin } from "./client.server";
import { getStartContext } from "@tanstack/start-storage-context";

function parseBearerToken(header: string | null | undefined) {
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : undefined;
}

export async function requireSupabaseAuth() {
  const startContext = getStartContext({ throwIfNotFound: false });

  if (startContext) {
    const token = parseBearerToken(startContext.request.headers.get("authorization"));
    if (!token) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const user = data?.user;
    if (error || !user) {
      throw new Error("Authentication required");
    }

    return { supabase, userId: user.id, claims: { sub: user.id } };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required");
  }

  return { supabase, userId: user.id, claims: { sub: user.id } };
}
