/**
 * Shared audit logging implementation
 * Used by both admin.functions.ts and portfolio.functions.ts
 * DUP-03: Consolidate audit logging mechanism
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AuditLogInput {
  action: string;
  user_id?: string | null;
  username?: string | null;
  entity?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  user_agent?: string | null;
}

/**
 * Insert audit log directly to database
 * Errors are logged but do not throw (audit failures should not break main operations)
 */
export async function insertAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: input.action,
      user_id: input.user_id ?? null,
      username: input.username ?? null,
      entity: input.entity ?? null,
      entity_id: input.entity_id ?? null,
      metadata: (input.metadata ?? {}) as never,
      user_agent: input.user_agent ?? null,
    });
  } catch (error) {
    // Log to console for debugging, but don't throw
    console.error("[Audit Log Insert Error]", error, input);
  }
}
