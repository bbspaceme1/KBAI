/**
 * DUP-04: Admin middleware for server functions
 * Validates both authentication and admin role from the authenticated user's token
 * Usage: .middleware([attachSupabaseAuth, requireAdminAuth])
 */
import { createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth, requireSupabaseAuthMiddleware } from "@/lib/with-auth";
import { CorrelationIdContext, logInfo, logWarn, logError } from "@/lib/observability";

// Server-side: validate admin role from authenticated user
const requireAdminAuth = createMiddleware({ type: "function" }).server(
  async ({ context, next }) => {
    // Generate correlation ID for request tracing
    const correlationId = CorrelationIdContext.generate();
    CorrelationIdContext.setRequestId(correlationId);

    logInfo("Admin middleware: validating admin access", {
      correlationId,
      middleware: "requireAdminAuth",
    });

    // requireSupabaseAuth already ran and provides userId and claims
    const userId = ((context ?? {}) as { userId?: string }).userId;
    if (!userId) {
      logWarn("Admin middleware: no user ID provided", {
        correlationId,
        middleware: "requireAdminAuth",
      });
      throw new Response("Unauthorized: No user ID", { status: 401 });
    }

    // Get roles from JWT claims (efficient, no DB query)
    const claims = ((context ?? {}) as { claims?: { app_metadata?: { roles?: string[] } } }).claims;
    const jwtRoles = claims?.app_metadata?.roles;

    if (!jwtRoles || !jwtRoles.includes("admin")) {
      logWarn("Admin middleware: admin role check failed", {
        correlationId,
        userId,
        jwtRoles,
        middleware: "requireAdminAuth",
      });
      throw new Response("Forbidden: admin role required", { status: 403 });
    }

    logInfo("Admin middleware: admin access granted", {
      correlationId,
      userId,
      jwtRoles,
      middleware: "requireAdminAuth",
    });

    return next({
      context: {
        ...((context ?? {}) as Record<string, unknown>),
        userId, // Already verified to be admin
        correlationId,
      },
    });
  },
);

// Combined middleware: auth + admin role check
export const adminAuthMiddleware = [
  attachSupabaseAuth,
  requireSupabaseAuthMiddleware,
  requireAdminAuth,
] as const;

/**
 * Advisor middleware - checks for admin OR advisor role
 */
const requireAdvisorAuth = createMiddleware({ type: "function" }).server(
  async ({ context, next }) => {
    const userId = ((context ?? {}) as { userId?: string }).userId;
    if (!userId) {
      throw new Response("Unauthorized: No user ID", { status: 401 });
    }

    const claims = ((context ?? {}) as { claims?: { app_metadata?: { roles?: string[] } } }).claims;
    const jwtRoles = claims?.app_metadata?.roles;

    const hasAdminOrAdvisor =
      jwtRoles && (jwtRoles.includes("admin") || jwtRoles.includes("advisor"));

    if (!hasAdminOrAdvisor) {
      throw new Response("Forbidden: admin or advisor role required", { status: 403 });
    }

    return next({
      context: {
        ...((context ?? {}) as Record<string, unknown>),
        userId,
      },
    });
  },
);

export const advisorAuthMiddleware = [
  attachSupabaseAuth,
  requireSupabaseAuthMiddleware,
  requireAdvisorAuth,
] as const;
