import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();
const insertAuditLogMock = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: vi.fn(async () => ({
    userId: "user-1",
  })),
}));

vi.mock("@/lib/audit.functions", () => ({
  insertAuditLog: insertAuditLogMock,
}));

const { submitTransaction } = await import("../portfolio.functions");

describe("submitTransaction SELL race regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let remainingLot = 1;

    rpcMock.mockImplementation(async (name: string, params?: Record<string, unknown>) => {
      if (name === "adjust_cash_balance") {
        return { data: 123, error: null };
      }

      if (name === "upsert_holding_sell") {
        if (remainingLot < Number(params?.p_lot ?? 0)) {
          throw new Error("Insufficient lot: have 0, requested 1");
        }
        remainingLot -= Number(params?.p_lot ?? 0);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "holdings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { total_lot: 1 }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === "transactions") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "tx-1" }, error: null }),
            }),
          }),
        };
      }

      return {
        insert: async () => ({ error: null }),
      };
    });
  });

  it("rejects one concurrent SELL when the second request tries to spend the same lot", async () => {
    const [first, second] = await Promise.allSettled([
      submitTransaction({
        ticker: "BBCA",
        side: "SELL",
        lot: 1,
        price: 10_000,
        transacted_at: "2026-08-04",
      }),
      submitTransaction({
        ticker: "BBCA",
        side: "SELL",
        lot: 1,
        price: 10_000,
        transacted_at: "2026-08-04",
      }),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    if (second.status === "rejected") {
      expect(String(second.reason)).toContain("Insufficient lot");
    }
  });
});
