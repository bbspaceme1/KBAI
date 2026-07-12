import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

/**
 * Get admin database client (bypasses RLS)
 * ARCH-01: Only use for explicitly admin-level operations
 * ⚠️ WARNING: This bypasses Row Level Security. Use with extreme caution.
 * Examples: system maintenance, batch admin operations, audit purging
 */
export function getAdminDatabaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not available in this environment");
  }
  return supabaseAdmin;
}

/**
 * Get user-scoped database client (enforces RLS via access token)
 * ARCH-01: Always use for user operations where RLS must be enforced
 * @param accessToken JWT token from authenticated user's session
 * @returns Supabase client scoped to authenticated user
 */
export function getUserScopedDatabaseClient(accessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase configuration (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) is missing",
    );
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Legacy function: DO NOT USE for new code
 * ARCH-01: Kept for backwards compatibility only
 * Use getAdminDatabaseClient() or getUserScopedDatabaseClient() instead
 * @deprecated Use explicit getAdminDatabaseClient() or getUserScopedDatabaseClient(token)
 */
export function getServerDatabaseClient(accessToken?: string) {
  if (!accessToken) {
    // BREAKING: No longer silently fallback to admin client
    throw new Error(
      "getServerDatabaseClient() requires accessToken. " +
        "Use getUserScopedDatabaseClient(token) or getAdminDatabaseClient() explicitly.",
    );
  }
  return getUserScopedDatabaseClient(accessToken);
}
