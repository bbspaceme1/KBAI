import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.SUPABASE_URL_2 ?? process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY_2 ?? process.env.SUPABASE_ANON_KEY;
const userAToken = process.env.RLS_TEST_USER_A_TOKEN;
const userAId = process.env.RLS_TEST_USER_A_ID;
const userBId = process.env.RLS_TEST_USER_B_ID;
const advisorToken = process.env.RLS_TEST_ADVISOR_TOKEN;
const advisorId = process.env.RLS_TEST_ADVISOR_ID;
const assignedClientId = process.env.RLS_TEST_ASSIGNED_CLIENT_ID;
const unassignedClientId = process.env.RLS_TEST_UNASSIGNED_CLIENT_ID;
const enabled = Boolean(url && anonKey && userAToken && userAId && userBId);

if (process.env.CI === "true" && !enabled) {
  throw new Error(
    "Behavioral RLS tests require isolated staging credentials: SUPABASE_URL, SUPABASE_ANON_KEY, RLS_TEST_USER_A_TOKEN, RLS_TEST_USER_A_ID, and RLS_TEST_USER_B_ID",
  );
}

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

  it("denies User A access to User B holdings, transactions, and portfolios", async () => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const results = await Promise.all([
      authenticated.from("holdings").select("*").eq("user_id", userBId),
      authenticated.from("transactions").select("*").eq("user_id", userBId),
      authenticated.from("portfolios").select("*").eq("user_id", userBId),
    ]);

    for (const result of results) {
      expect(result.error ?? result.data).toBeTruthy();
      expect(result.data?.some((row) => Object.values(row).includes(userBId))).toBe(false);
    }
  });

  it("rejects a normal user from admin-only RPC authorization", async () => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const { error } = await authenticated.rpc("rls_auto_enable");
    expect(error).toBeTruthy();
  });

  it("allows Advisor A to select assigned clients but not unassigned clients", async () => {
    if (!advisorToken || !advisorId || !assignedClientId || !unassignedClientId) {
      throw new Error(
        "Advisor RLS tests require RLS_TEST_ADVISOR_TOKEN, RLS_TEST_ADVISOR_ID, RLS_TEST_ASSIGNED_CLIENT_ID, and RLS_TEST_UNASSIGNED_CLIENT_ID",
      );
    }

    const advisor = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${advisorToken}` } },
    });
    const [assigned, unassigned] = await Promise.all([
      advisor.from("holdings").select("user_id").eq("user_id", assignedClientId),
      advisor.from("holdings").select("user_id").eq("user_id", unassignedClientId),
    ]);

    expect(assigned.error).toBeNull();
    expect(assigned.data?.every((row) => row.user_id === assignedClientId)).toBe(true);
    expect(unassigned.error).toBeNull();
    expect(unassigned.data).toHaveLength(0);
    void advisorId;
  });
});
