import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminDatabaseClient } from "@/lib/backend-client.server";
import { requireAdminAccess } from "@/lib/rbac";
import { fetchMarketQuotes } from "@/lib/market-data-provider";
import { toYahoo, fromYahoo } from "@/lib/idx-tickers";
import { insertAuditLog } from "@/lib/audit.functions";

export type TxnInput = {
  ticker: string;
  side: "BUY" | "SELL";
  lot: number;
  price: string | number;
  transacted_at?: string;
  created_at?: string;
};

export function computeHoldingsFromTxns(txns: TxnInput[]) {
  const map = new Map<string, { lot: number; cost: number; avg: number }>();

  for (const t of txns) {
    const cur = map.get(t.ticker) ?? { lot: 0, cost: 0, avg: 0 };
    const price = Number(t.price);

    if (t.side === "BUY") {
      cur.lot += t.lot;
      cur.cost += t.lot * price;
      cur.avg = cur.lot > 0 ? cur.cost / cur.lot : 0;
    } else {
      const sold = Math.min(t.lot, cur.lot);
      cur.lot -= sold;
      cur.cost -= sold * cur.avg;
      if (cur.lot === 0) cur.cost = 0;
    }
    map.set(t.ticker, cur);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.lot > 0)
    .map(([ticker, v]) => ({
      ticker,
      total_lot: v.lot,
      avg_price: Number(v.avg.toFixed(4)),
    }));
}

type SupabaseRpcResult<T> = { data: T | null; error: { message?: string } | null };

function rpcCall<T>(fnName: string, params?: object): Promise<SupabaseRpcResult<T>> {
  const typedRpc = supabaseAdmin.rpc as unknown as <U = unknown>(
    name: string,
    parameters?: object,
  ) => Promise<SupabaseRpcResult<U>>;
  return typedRpc(fnName, params);
}

async function atomicAdjustCash(userId: string, delta: number): Promise<number> {
  const { data, error } = await rpcCall<number>("adjust_cash_balance", {
    p_user_id: userId,
    p_delta: delta,
  });
  if (error) throw new Error(`Cash balance update gagal: ${error.message}`);
  return Number(data);
}

// ============================================
// Refresh EOD prices for all holdings (admin only)
// ============================================
export async function refreshEodPrices(data: { access_token?: string } = {}) {
  // ARCH-01: System-level operation always uses admin client
  const db = getAdminDatabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Distinct tickers from holdings
  const { data: holdings, error: hErr } = await db
    .from("holdings")
    .select("ticker")
    .gt("total_lot", 0);
  if (hErr) throw new Error(hErr.message);

  const tickers = Array.from(new Set((holdings ?? []).map((h) => h.ticker)));
  if (tickers.length === 0) {
    return { updated: 0, tickers: [], message: "No active holdings to update" };
  }

  // 2. Fetch from market-data provider chain with Yahoo Finance as fallback
  const yahooSymbols = tickers.map(toYahoo);
  const benchmarkSymbols = ["^JKSE"]; // IHSG
  const allSymbols = [...yahooSymbols, ...benchmarkSymbols];
  const quotes = await fetchMarketQuotes(allSymbols);

  // 3. Upsert eod_prices
  const eodRows = Object.entries(quotes)
    .filter(([sym]) => sym.endsWith(".JK"))
    .map(([sym, close]) => ({
      ticker: fromYahoo(sym),
      date: today,
      close,
      source: "yahoo",
    }));

  if (eodRows.length > 0) {
    const { error } = await db.from("eod_prices").upsert(eodRows, { onConflict: "ticker,date" });
    if (error) throw new Error(error.message);
  }

  // IHSG benchmark
  if (quotes["^JKSE"]) {
    await db
      .from("benchmark_prices")
      .upsert([{ symbol: "IHSG" as const, date: today, value: quotes["^JKSE"] }], {
        onConflict: "symbol,date",
      });
  }

  // 4. Recompute snapshots + KBAI
  await recomputeSnapshotsAndKbai(db, today);

  await insertAuditLog({
    action: "market.refresh_prices",
    metadata: { count: eodRows.length, today },
  });

  return { updated: eodRows.length, tickers: eodRows.map((r) => r.ticker) };
}

async function recomputeSnapshotsAndKbai(
  db: ReturnType<typeof getAdminDatabaseClient>,
  date: string,
) {
  // Get all holdings + eod prices for the date
  const [{ data: holdings }, { data: prices }] = await Promise.all([
    db.from("holdings").select("user_id, ticker, total_lot, avg_price"),
    db.from("eod_prices").select("ticker, close").eq("date", date),
  ]);

  const priceMap = new Map((prices ?? []).map((p) => [p.ticker, Number(p.close)]));

  // Aggregate by user
  const userAgg = new Map<string, { value: number; cost: number }>();
  for (const h of holdings ?? []) {
    const last = priceMap.get(h.ticker);
    if (last == null) continue; // skip if no price
    const lot = h.total_lot;
    const value = lot * last * 100; // 1 lot = 100 shares
    const cost = lot * Number(h.avg_price) * 100;
    const cur = userAgg.get(h.user_id) ?? { value: 0, cost: 0 };
    cur.value += value;
    cur.cost += cost;
    userAgg.set(h.user_id, cur);
  }

  const snapshotRows = Array.from(userAgg.entries()).map(([user_id, v]) => ({
    user_id,
    date,
    total_value: v.value,
    total_cost: v.cost,
    total_pl: v.value - v.cost,
  }));

  if (snapshotRows.length > 0) {
    await db.from("portfolio_snapshots").upsert(snapshotRows, { onConflict: "user_id,date" });
  }

  // KBAI = average % return across users (base 100)
  const totalValue = snapshotRows.reduce((s, r) => s + r.total_value, 0);
  const totalCost = snapshotRows.reduce((s, r) => s + r.total_cost, 0);
  const indexValue = totalCost > 0 ? (totalValue / totalCost) * 100 : 100;

  // pct change vs previous day
  const { data: prev } = await db
    .from("kbai_index")
    .select("value")
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(1);
  const prevVal = prev?.[0]?.value ? Number(prev[0].value) : indexValue;
  const pct = prevVal > 0 ? ((indexValue - prevVal) / prevVal) * 100 : 0;

  await db.from("kbai_index").upsert(
    [
      {
        date,
        value: indexValue,
        pct_change: pct,
        member_count: snapshotRows.length,
      },
    ],
    { onConflict: "date" },
  );
}

// ============================================
// Recompute holdings for a user (server-side, bypasses RLS)
// ============================================
export async function recomputeHoldings() {
  const { supabase, userId } = await requireSupabaseAuth();

  const { data: txns, error } = await supabaseAdmin
    .from("transactions")
    .select("ticker, side, lot, price, transacted_at, created_at")
    .eq("user_id", userId)
    .order("transacted_at", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = computeHoldingsFromTxns(txns ?? []).map((r) => ({
    ...r,
    user_id: userId,
  }));

  await supabaseAdmin.from("holdings").delete().eq("user_id", userId);
  if (rows.length > 0) await supabaseAdmin.from("holdings").insert(rows);

  return { count: rows.length };
}

// ============================================
// Submit transaction (BUY/SELL) — validates holdings & cash, posts cash movement
// ============================================
export async function submitTransaction(data: {
  ticker: string;
  side: "BUY" | "SELL";
  lot: number;
  price: number;
  transacted_at: string;
}) {
  const { supabase, userId } = await requireSupabaseAuth();

  const today = new Date().toISOString().slice(0, 10);
  if (data.transacted_at > today) {
    throw new Error("Tanggal tidak boleh lebih dari hari ini");
  }
  const notional = data.lot * data.price * 100;

  if (data.side === "SELL") {
    const { data: h } = await supabaseAdmin
      .from("holdings")
      .select("total_lot")
      .eq("user_id", userId)
      .eq("ticker", data.ticker)
      .maybeSingle();
    const owned = h?.total_lot ?? 0;
    if (owned < data.lot) {
      throw new Error(
        `Tidak bisa jual ${data.lot} lot — kamu hanya punya ${owned} lot ${data.ticker}`,
      );
    }
  }

  // Insert transaction
  const { data: tx, error: txErr } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: userId,
      ticker: data.ticker,
      side: data.side,
      lot: data.lot,
      price: data.price,
      transacted_at: data.transacted_at,
    })
    .select("id")
    .single();
  if (txErr) throw new Error(txErr.message);

  // Cash movement: BUY → cash turun, SELL → cash naik
  const delta = data.side === "BUY" ? -notional : notional;
  await supabaseAdmin.from("cash_movements").insert({
    user_id: userId,
    movement_type: data.side,
    amount: delta,
    ref_transaction_id: tx.id,
    occurred_at: data.transacted_at,
  });

  const newBalance = await atomicAdjustCash(userId, delta);

  // IMP-02: Incremental holdings update via RPC instead of full recompute
  if (data.side === "BUY") {
    await rpcCall<unknown>("upsert_holding_buy", {
      p_user_id: userId,
      p_ticker: data.ticker,
      p_lot: data.lot,
      p_price: data.price,
    });
  } else {
    await rpcCall<unknown>("upsert_holding_sell", {
      p_user_id: userId,
      p_ticker: data.ticker,
      p_lot: data.lot,
    });
  }

  await insertAuditLog({
    action: `tx.${data.side.toLowerCase()}`,
    user_id: userId,
    metadata: { ticker: data.ticker, lot: data.lot, price: data.price, notional },
    entity: "transaction",
    entity_id: tx.id,
  });

  return { ok: true, balance: newBalance };
}

// ============================================
// Cash deposit / withdraw / adjust (manual)
// ============================================
export async function adjustCash(data: {
  movement_type: "DEPOSIT" | "WITHDRAW" | "ADJUST";
  amount: number;
  occurred_at: string;
  note?: string;
}) {
  const { supabase, userId } = await requireSupabaseAuth();

  const delta = data.movement_type === "WITHDRAW" ? -data.amount : data.amount;
  const { data: cur } = await supabaseAdmin
    .from("cash_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  const curBal = Number(cur?.balance ?? 0);
  if (data.movement_type === "WITHDRAW" && curBal + delta < 0) {
    throw new Error(`Saldo tidak cukup. Saldo saat ini: ${curBal.toLocaleString("id-ID")}`);
  }
  await supabaseAdmin.from("cash_movements").insert({
    user_id: userId,
    movement_type: data.movement_type,
    amount: delta,
    occurred_at: data.occurred_at,
    note: data.note ?? null,
  });
  const newBalance = await atomicAdjustCash(userId, delta);
  return { balance: newBalance };
}

// ============================================
// Admin: create user account
// ============================================
export async function createUserAccount(data: {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      username: data.username,
      display_name: data.display_name ?? data.username,
    },
  });
  if (error) throw new Error(error.message);
  return { user_id: created.user?.id };
}

// audit wrapper note: adminCreateUser/Update/Delete/GrantRole logged via writeAuditLog client-side after success

export async function listAllUsers() {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  const [{ data: profiles, error: profileErr }, { data: allRoles, error: rolesErr }, authUsers] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id, username, display_name, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
  if (profileErr) throw new Error(profileErr.message);
  if (rolesErr) throw new Error(rolesErr.message);
  if (authUsers.error) throw new Error(authUsers.error.message);

  const roleMap = new Map<string, string[]>();
  for (const r of allRoles ?? []) {
    roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), String(r.role)]);
  }
  const emailMap = new Map(authUsers.data.users.map((u) => [u.id, u.email ?? ""]));

  return (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) ?? "",
    roles: roleMap.get(p.id) ?? [],
  }));
}

// ============================================
// Admin: promote user to admin
// ============================================
export async function grantUserRole(data: {
  target_user_id: string;
  role: "admin" | "user" | "advisor";
}) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  if (data.role !== "admin") {
    const { data: currentAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminCount = currentAdmins?.length ?? 0;
    const { data: currentRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.target_user_id);
    const targetIsAdmin = !!currentRoles?.some((r) => String(r.role) === "admin");
    if (targetIsAdmin && adminCount <= 1) {
      throw new Error("Tidak bisa demote admin terakhir.");
    }
  }

  await supabaseAdmin
    .from("user_roles")
    .upsert([{ user_id: data.target_user_id, role: data.role as never }], {
      onConflict: "user_id,role",
    });
  return { ok: true };
}

// ============================================
// Admin: delete user
// ============================================
export async function deleteUser(data: { target_user_id: string }) {
  const { userId } = await requireSupabaseAuth();
  await requireAdminAccess(userId);

  const { data: currentAdmins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const adminCount = currentAdmins?.length ?? 0;

  const { data: targetRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.target_user_id);
  const targetIsAdmin = !!targetRoles?.some((r) => String(r.role) === "admin");
  if (targetIsAdmin && adminCount <= 1) {
    throw new Error("Tidak bisa menghapus admin terakhir.");
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(data.target_user_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ============================================
export async function bootstrapAdmin(data: { user_id: string; bootstrap_secret: string }) {
  const expected = import.meta.env.VITE_BOOTSTRAP_SECRET;
  if (!expected || data.bootstrap_secret !== expected) {
    throw new Response("Forbidden", { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error("Admin already exists");
  }
  await supabaseAdmin
    .from("user_roles")
    .upsert([{ user_id: data.user_id, role: "admin" }], { onConflict: "user_id,role" });
  return { ok: true };
}

// Aliases for backward compatibility
export const adminCreateUser = createUserAccount;
export const adminGrantRole = grantUserRole;
export const adminDeleteUser = deleteUser;
export const adminListUsers = listAllUsers;
export async function adminUpdateUser(_data: unknown): Promise<never> {
  throw new Error("adminUpdateUser not implemented");
}
