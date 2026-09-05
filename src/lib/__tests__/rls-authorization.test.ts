import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.SUPABASE_URL_2 ?? process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY_2 ?? process.env.SUPABASE_ANON_KEY;
const enabled = Boolean(url && anonKey && process.env.RLS_TEST_USER_A_TOKEN);

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
