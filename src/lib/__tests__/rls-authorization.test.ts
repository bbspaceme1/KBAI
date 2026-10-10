import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

// These integration tests must use an explicitly designated isolated database.
// Do not fall back to generic/production environment variables.
const isolatedEnvironment = process.env.RLS_TEST_ENVIRONMENT === "isolated";
const url = isolatedEnvironment ? process.env.RLS_TEST_SUPABASE_URL : undefined;
const anonKey = isolatedEnvironment ? process.env.RLS_TEST_SUPABASE_ANON_KEY : undefined;
const userAToken = process.env.RLS_TEST_USER_A_TOKEN;
const userAId = process.env.RLS_TEST_USER_A_ID;
const userBId = process.env.RLS_TEST_USER_B_ID;
const advisorToken = process.env.RLS_TEST_ADVISOR_TOKEN;
const advisorId = process.env.RLS_TEST_ADVISOR_ID;
const assignedClientId = process.env.RLS_TEST_ASSIGNED_CLIENT_ID;
const unassignedClientId = process.env.RLS_TEST_UNASSIGNED_CLIENT_ID;
const enabled = Boolean(isolatedEnvironment && url && anonKey && userAToken && userAId && userBId);

describe.skipIf(!enabled)("isolated-database RLS/RBAC authorization matrix", () => {
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

  it("rejects AI quota consumption for another user's ID", async () => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const { data, error } = await authenticated.rpc("try_consume_ai_quota", {
      p_user: userBId,
      p_tokens: 1,
    });

    expect(error).toBeTruthy();
    expect(data).not.toBe(true);
  });

  it.each([0, -1])("rejects invalid AI quota token count %i", async (tokens) => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const { data, error } = await authenticated.rpc("try_consume_ai_quota", {
      p_user: userAId,
      p_tokens: tokens,
    });

    expect(error || data === false).toBeTruthy();
    expect(data).not.toBe(true);
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

  it("denies User A access to User B holdings, transactions, and portfolio snapshots", async () => {
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const results = await Promise.all([
      authenticated.from("holdings").select("*").eq("user_id", userBId),
      authenticated.from("transactions").select("*").eq("user_id", userBId),
      authenticated.from("portfolio_snapshots").select("*").eq("user_id", userBId),
    ]);

    for (const result of results) {
      expect(result.error).toBeNull();
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

  it("does not let a normal user probe another user's role assignments", async () => {
    if (!advisorId) throw new Error("RLS_TEST_ADVISOR_ID is required for role-probing test");
    const authenticated = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${userAToken}` } },
    });
    const { data, error } = await authenticated.rpc("has_role", {
      _user_id: advisorId,
      _role: "advisor",
    });

    expect(error).toBeNull();
    expect(data).toBe(false);
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
    const [identity, assignment, assigned, unassigned] = await Promise.all([
      advisor.from("user_sub_roles").select("user_id, role").eq("user_id", advisorId),
      advisor
        .from("advisor_clients")
        .select("client_id")
        .eq("advisor_id", advisorId)
        .eq("client_id", assignedClientId),
      advisor.from("holdings").select("user_id").eq("user_id", assignedClientId),
      advisor.from("holdings").select("user_id").eq("user_id", unassignedClientId),
    ]);

    expect(identity.error).toBeNull();
    expect(identity.data?.some((row) => row.user_id === advisorId)).toBe(true);
    expect(assignment.error).toBeNull();
    expect(assignment.data).toHaveLength(1);
    expect(assigned.error).toBeNull();
    expect(assigned.data?.every((row) => row.user_id === assignedClientId)).toBe(true);
    expect(unassigned.error).toBeNull();
    expect(unassigned.data).toHaveLength(0);
    void advisorId;
  });
});
