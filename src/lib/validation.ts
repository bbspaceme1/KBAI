/**
 * Shared Zod validation schemas for all server functions
 * Ensures consistent input validation across the application
 *
 * Usage in server functions:
 * export const myFunction = createServerFn()
 *   .validator(portfolioTransactionSchema)
 *   .handler(async ({ data }) => {
 *     // data is already typed and validated
 *   })
 */

import { z } from "zod";

// ============================================================================
// PORTFOLIO DOMAIN SCHEMAS
// ============================================================================

export const portfolioTransactionSchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker required")
    .max(10, "Ticker too long")
    .regex(/^[A-Z0-9]{1,5}$/, "Invalid ticker format")
    .transform((s) => s.toUpperCase()),

  lot: z
    .number()
    .int("Lot must be integer")
    .positive("Lot must be positive")
    .max(100_000_000, "Lot too large"),

  price: z
    .number()
    .positive("Price must be positive")
    .finite("Price must be finite")
    .max(100_000_000, "Price too large"),

  type: z.enum(["BUY", "SELL"], {
    errorMap: () => ({ message: "Type must be BUY or SELL" }),
  }),

  date: z
    .string()
    .datetime({ message: "Date must be ISO 8601 format" })
    .refine((date) => new Date(date) <= new Date(), "Transaction date cannot be in future"),

  note: z.string().max(500, "Note too long").optional(),
});

export type PortfolioTransaction = z.infer<typeof portfolioTransactionSchema>;

export const portfolioHoldingsSchema = z.object({
  ticker: z.string().min(1).max(10),
  userId: z.string().uuid("Invalid user ID"),
});

export const watchlistItemSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]{1,5}$/, "Invalid ticker")
    .transform((s) => s.toUpperCase()),

  alertPrice: z.number().positive("Alert price must be positive").optional(),

  alertType: z.enum(["ABOVE", "BELOW"]).optional(),
});

export const removeWatchlistSchema = z.object({
  id: z.string().uuid("Invalid watchlist item ID"),
});

export const priceAlertSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]{1,5}$/, "Invalid ticker")
    .transform((s) => s.toUpperCase()),
  condition: z.enum(["above", "below"]),
  threshold: z
    .number()
    .positive("Threshold must be positive")
    .max(100_000_000, "Threshold too large"),
});

export type WatchlistItem = z.infer<typeof watchlistItemSchema>;
export type RemoveWatchlistInput = z.infer<typeof removeWatchlistSchema>;
export type PriceAlertInput = z.infer<typeof priceAlertSchema>;

// ============================================================================
// AI & INSIGHT DOMAIN SCHEMAS
// ============================================================================

export const aiInsightRequestSchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]{1,5}$/),

  analysisType: z.enum(["VALUATION", "TECHNICAL", "FUNDAMENTAL", "SENTIMENT"]),

  timeframe: z.enum(["1W", "1M", "3M", "6M", "1Y", "ALL"]).default("3M"),

  includeHistorical: z.boolean().default(false),

  compareWith: z.array(z.string()).max(5, "Can compare with max 5 tickers").default([]),
});

export type AIInsightRequest = z.infer<typeof aiInsightRequestSchema>;

export const aiQuotaRequestSchema = z.object({
  userId: z.string().uuid(),
  operation: z.enum([
    "VALUATION_ANALYSIS",
    "MARKET_BRIEF",
    "SENTIMENT_CHECK",
    "SCREENER_QUERY",
    "PORTFOLIO_RECOMMENDATION",
  ]),
  estimatedTokens: z.number().positive().int(),
});

// ============================================================================
// ADMIN & RBAC SCHEMAS
// ============================================================================

export const adminActionSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  action: z.enum(["PROMOTE_TO_ADVISOR", "REVOKE_ADMIN", "RESET_PASSWORD", "DISABLE_ACCOUNT"]),
  reason: z.string().min(10, "Reason must be at least 10 chars").max(500),
});

export type AdminAction = z.infer<typeof adminActionSchema>;

export const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["member", "advisor", "admin"]),
  grantedBy: z.string().uuid(),
  grantedAt: z.date().default(() => new Date()),
});

// ============================================================================
// DATA PRIVACY SCHEMAS
// ============================================================================

export const dataExportRequestSchema = z.object({
  userId: z.string().uuid(),
  format: z.enum(["JSON", "CSV"]).default("JSON"),
  includeTransactions: z.boolean().default(true),
  includeWatchlist: z.boolean().default(true),
  includeAILogs: z.boolean().default(false),
  includeActivityLog: z.boolean().default(true),
});

export type DataExportRequest = z.infer<typeof dataExportRequestSchema>;

export const accountDeletionSchema = z.object({
  userId: z.string().uuid(),
  confirmationCode: z.string().length(6, "Invalid confirmation code"),
  reason: z.string().max(1000).optional(),
  deletionType: z.enum(["SOFT", "HARD"]).default("SOFT"),
});

// ============================================================================
// COMMUNITY & BROADCAST SCHEMAS
// ============================================================================

export const communityBroadcastSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 chars").max(200, "Title too long"),

  content: z.string().min(20, "Content must be at least 20 chars").max(5000, "Content too long"),

  targetRole: z.enum(["ALL", "MEMBER", "ADVISOR", "ADMIN"]).default("ALL"),

  scheduledFor: z.date().optional(),

  attachments: z.array(z.string().url()).max(5).optional(),
});

export type CommunityBroadcast = z.infer<typeof communityBroadcastSchema>;

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 chars"),
  rememberMe: z.boolean().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z
      .string()
      .min(12, "New password must be at least 12 chars")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[a-z]/, "Must contain lowercase")
      .regex(/[0-9]/, "Must contain number")
      .regex(/[^A-Za-z0-9]/, "Must contain special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const mfaSetupSchema = z.object({
  method: z.enum(["AUTHENTICATOR", "SMS", "EMAIL"]),
  verificationCode: z.string().length(6),
});

// ============================================================================
// MARKET DATA SCHEMAS
// ============================================================================

export const tickerSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query required")
    .max(50)
    .regex(/^[A-Z0-9\s.-]*$/, "Invalid characters"),

  limit: z.number().int().min(1).max(50).default(10),
});

export const screenerFilterSchema = z.object({
  sector: z.array(z.string()).optional(),
  marketCap: z
    .object({
      min: z.number().positive().optional(),
      max: z.number().positive().optional(),
    })
    .optional(),
  peRatio: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  dividendYield: z
    .object({
      min: z.number().min(0).max(100).optional(),
      max: z.number().min(0).max(100).optional(),
    })
    .optional(),
  volumeMin: z.number().positive().optional(),
  priceChangeMin: z.number().optional(),
  sortBy: z.enum(["MARKET_CAP", "PE_RATIO", "DIVIDEND_YIELD", "PRICE_CHANGE"]).optional(),
  sortOrder: z.enum(["ASC", "DESC"]).default("DESC"),
  limit: z.number().int().min(1).max(500).default(100),
});

export type ScreenerFilter = z.infer<typeof screenerFilterSchema>;

// ============================================================================
// PAGINATION & COMMON SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  field: z.string(),
  order: z.enum(["ASC", "DESC"]).default("ASC"),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse and validate input data
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  }

  return { success: false, errors };
}

/**
 * Create a middleware-friendly validator for TanStack Server Functions
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Validation failed: ${errors}`);
    }
    return result.data;
  };
}
