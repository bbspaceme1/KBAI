import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.SUPABASE_URL_2 ?? process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY_2 ?? process.env.SUPABASE_ANON_KEY;
const userAToken = process.env.RLS_TEST_USER_A_TOKEN;
const userAId = process.env.RLS_TEST_USER_A_ID;
const userBId = process.env.RLS_TEST_USER_B_ID;
const enabled = Boolean(url && anonKey && userAToken && userAId && userBId);

describe.skipIf(!enabled)("staging RLS/RBAC authorization matrix", () => {
  const client = (): SupabaseClient => createClient(url!, anonKey!);

  it("does not allow an anonymous client to execute financial RPCs", async () => {
    const anonymous = client();
    const calls = await Promise.all([
      anonymous.rpc("upsert_holding_buy", {
        p_user_id: crypto.randomUUID(),
        p_ticker: "BBCA",
        p_lot: 1,
        p_price: 1000,
      }),
      anonymous.rpc("upsert_holding_sell", {
        p_user_id: crypto.randomUUID(),
        p_ticker: "BBCA",
        p_lot: 1,
      }),
      anonymous.rpc("adjust_cash_balance", {
        p_user_id: crypto.randomUUID(),
        p_delta: 1,
      }),
    ]);

    expect(calls.every(({ error }) => error)).toBe(true);
  });

  it("allows a user to call financial RPCs only for their own user id", async () => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const ownCall = await authenticated.rpc("adjust_cash_balance", {
      p_user_id: userAId,
      p_delta: 0,
    });
    const otherCall = await authenticated.rpc("adjust_cash_balance", {
      p_user_id: userBId,
      p_delta: 0,
    });

    expect(ownCall.error).toBeNull();
    expect(otherCall.error).toBeTruthy();
  });

  it("rejects User A calling BUY and SELL for User B", async () => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const [buy, sell] = await Promise.all([
      authenticated.rpc("upsert_holding_buy", {
        p_user_id: userBId,
        p_ticker: "BBCA",
        p_lot: 0,
        p_price: 0,
      }),
      authenticated.rpc("upsert_holding_sell", {
        p_user_id: userBId,
        p_ticker: "BBCA",
        p_lot: 0,
      }),
    ]);

    expect(buy.error).toBeTruthy();
    expect(sell.error).toBeTruthy();
  });

  it("does not expose compliance view data to anonymous clients", async () => {
    const { error } = await client().from("data_compliance_status").select("*").limit(1);
    expect(error).toBeTruthy();
  });

  it("does not treat a client-supplied role claim as authorization", async () => {
    const tampered = createClient(url!, anonKey!, {
      global: { headers: { Authorization: "Bearer invalid-tampered-role-token" } },
    });
    const { error } = await tampered.rpc("rls_auto_enable");
    expect(error).toBeTruthy();
  });

  it.todo("User A cannot select User B holdings, transactions, or portfolios");
  it.todo("Advisor A can select assigned clients but not unassigned clients");
  it.todo("A user-role session cannot call admin-only RPC functions");
});
