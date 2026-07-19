import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IDX_TICKERS, toYahoo, fromYahoo } from "@/lib/idx-tickers";
import { getAdminDatabaseClient } from "@/lib/backend-client.server";
import { fetchMarketQuotes, fetchMarketChart } from "@/lib/market-data-provider";
import { requireAdminAccess } from "@/lib/rbac";

async function requireAdmin() {
  const { userId } = await requireSupabaseAuth();
  return requireAdminAccess(userId);
}

async function fetchBtcSpotUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { bitcoin?: { usd?: number } };
    return typeof j.bitcoin?.usd === "number" ? j.bitcoin.usd : null;
  } catch {
    const yahoo = await fetchMarketQuotes(["BTC-USD"]);
    return yahoo["BTC-USD"] ?? null;
  }
}

async function fetchBtcDailyUsd(
  fromUnix: number,
  toUnix: number,
): Promise<Array<{ date: string; close: number }>> {
  const yahooBars = await fetchMarketChart("BTC-USD", fromUnix, toUnix);
  if (yahooBars.length > 0) return yahooBars;

  // CoinGecko free tier: max 365 days history.
  // Chunk into 80-day windows to ensure daily granularity (range <90d returns hourly).
  const ONE_YEAR_SEC = 365 * 24 * 60 * 60;
  const maxFrom = Math.floor(Date.now() / 1000) - ONE_YEAR_SEC + 86400;
  const safeFrom = Math.max(fromUnix, maxFrom);
  const byDay = new Map<string, number>();
  const CHUNK = 80 * 24 * 60 * 60; // 80 days
  for (let start = safeFrom; start < toUnix; start += CHUNK) {
    const end = Math.min(start + CHUNK, toUnix);
    try {
      const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${start}&to=${end}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const j = (await res.json()) as { prices?: Array<[number, number]> };
      for (const [ms, price] of j.prices ?? []) {
        const d = new Date(ms).toISOString().slice(0, 10);
        byDay.set(d, price); // last value of the day wins
      }
    } catch {
      continue;
    }
    // Be polite to the free public API
    await new Promise((r) => setTimeout(r, 300));
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, close]) => ({ date, close }));
}

async function recomputeKbaiRange(
  db: ReturnType<typeof getAdminDatabaseClient>,
  fromDate: string,
  toDate: string,
) {
  const [{ data: holdings }, { data: prices }, { count: memberCount }] = await Promise.all([
    db.from("holdings").select("user_id, ticker, total_lot, avg_price").gt("total_lot", 0),
    db
      .from("eod_prices")
      .select("ticker, close, date")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
    db.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const priceByDateTicker = new Map<string, number>();
  const dates = new Set<string>();
  for (const p of prices ?? []) {
    dates.add(p.date);
    priceByDateTicker.set(`${p.date}:${p.ticker}`, Number(p.close));
  }

  let prevIndex: number | null = null;
  const kbaiRows: Array<{ date: string; value: number; pct_change: number; member_count: number }> =
    [];
  const snapshotRows: Array<{
    user_id: string;
    date: string;
    total_value: number;
    total_cost: number;
    total_pl: number;
  }> = [];
  for (const date of Array.from(dates).sort()) {
    const userAgg = new Map<string, { value: number; cost: number }>();
    for (const h of holdings ?? []) {
      const close = priceByDateTicker.get(`${date}:${h.ticker}`);
      if (close == null) continue;
      const value = Number(h.total_lot) * close * 100;
      const cost = Number(h.total_lot) * Number(h.avg_price) * 100;
      const cur = userAgg.get(h.user_id) ?? { value: 0, cost: 0 };
      cur.value += value;
      cur.cost += cost;
      userAgg.set(h.user_id, cur);
    }
    for (const [user_id, v] of userAgg) {
      snapshotRows.push({
        user_id,
        date,
        total_value: v.value,
        total_cost: v.cost,
        total_pl: v.value - v.cost,
      });
    }
    const totalValue = Array.from(userAgg.values()).reduce((s, v) => s + v.value, 0);
    const totalCost = Array.from(userAgg.values()).reduce((s, v) => s + v.cost, 0);
    const indexValue = totalCost > 0 ? (totalValue / totalCost) * 100 : 100;
    const pct = prevIndex && prevIndex > 0 ? ((indexValue - prevIndex) / prevIndex) * 100 : 0;
    prevIndex = indexValue;
    kbaiRows.push({
      date,
      value: indexValue,
      pct_change: pct,
      member_count: memberCount ?? userAgg.size,
    });
  }

  if (snapshotRows.length > 0)
    await db.from("portfolio_snapshots").upsert(snapshotRows, { onConflict: "user_id,date" });
  if (kbaiRows.length > 0) await db.from("kbai_index").upsert(kbaiRows, { onConflict: "date" });
  return { kbai_days: kbaiRows.length };
}

export async function refreshIntradayPrices(data: unknown = {}) {
  await requireAdmin();
  void data;
  const db = getAdminDatabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: holdings } = await db.from("holdings").select("ticker").gt("total_lot", 0);
  const heldTickers = (holdings ?? []).map((h) => h.ticker);
  const allTickers = Array.from(new Set([...heldTickers, ...IDX_TICKERS]));
  const batchSize = 80;
  const yahooSymbols = allTickers.map(toYahoo);
  const quotes: Record<string, number> = {};
  for (let i = 0; i < yahooSymbols.length; i += batchSize) {
    const batch = yahooSymbols.slice(i, i + batchSize);
    const got = await fetchMarketQuotes([...batch, "^JKSE"]);
    Object.assign(quotes, got);
  }
  const eodRows = Object.entries(quotes)
    .filter(([sym]) => sym.endsWith(".JK"))
    .map(([sym, close]) => ({
      ticker: fromYahoo(sym),
      date: today,
      close,
      source: "yahoo-intraday",
    }));
  if (eodRows.length > 0) {
    const { error } = await db.from("eod_prices").upsert(eodRows, { onConflict: "ticker,date" });
    if (error) throw new Error(error.message);
  }
  let ihsgUpdated = false;
  if (quotes["^JKSE"]) {
    const { error } = await db
      .from("benchmark_prices")
      .upsert([{ symbol: "IHSG" as const, date: today, value: quotes["^JKSE"] }], {
        onConflict: "symbol,date",
      });
    if (!error) ihsgUpdated = true;
  }
  let goldUpdated = false;
  const goldQuote = await fetchMarketQuotes(["GC=F"]);
  if (goldQuote["GC=F"]) {
    const { error } = await db
      .from("benchmark_prices")
      .upsert([{ symbol: "GOLD" as const, date: today, value: goldQuote["GC=F"] }], {
        onConflict: "symbol,date",
      });
    if (!error) goldUpdated = true;
  }
  let btcUpdated = false;
  const btcSpot = await fetchBtcSpotUsd();
  if (btcSpot != null) {
    const { error } = await db
      .from("benchmark_prices")
      .upsert([{ symbol: "BTC" as const, date: today, value: btcSpot }], {
        onConflict: "symbol,date",
      });
    if (!error) btcUpdated = true;
  }
  return {
    updated: eodRows.length,
    ihsg: ihsgUpdated ? quotes["^JKSE"] : null,
    gold: goldUpdated ? goldQuote["GC=F"] : null,
    btc: btcUpdated ? btcSpot : null,
    timestamp: new Date().toISOString(),
  };
}

export async function backfillEodFromApril(data: unknown = {}) {
  await requireAdmin();

  const db = getAdminDatabaseClient();
  const fromDate = (data as { from_date?: string }).from_date ?? "2020-04-01";
  const toDate = (data as { to_date?: string }).to_date ?? new Date().toISOString().slice(0, 10);
  const fromUnix = Math.floor(new Date(fromDate + "T00:00:00Z").getTime() / 1000);
  const toUnix = Math.floor(new Date(toDate + "T23:59:59Z").getTime() / 1000);

  // 1. Backfill IHSG benchmark
  const ihsgBars = await fetchMarketChart("^JKSE", fromUnix, toUnix);
  let ihsgInserted = 0;
  if (ihsgBars.length > 0) {
    const rows = ihsgBars.map((b) => ({
      symbol: "IHSG" as const,
      date: b.date,
      value: b.close,
    }));
    const { error } = await db.from("benchmark_prices").upsert(rows, { onConflict: "symbol,date" });
    if (!error) ihsgInserted = rows.length;
  }

  // 1b. Backfill GOLD (GC=F)
  const goldBars = await fetchMarketChart("GC=F", fromUnix, toUnix);
  let goldInserted = 0;
  if (goldBars.length > 0) {
    const rows = goldBars.map((b) => ({
      symbol: "GOLD" as const,
      date: b.date,
      value: b.close,
    }));
    const { error } = await db.from("benchmark_prices").upsert(rows, { onConflict: "symbol,date" });
    if (!error) goldInserted = rows.length;
  }

  // 1c. Backfill BTC via CoinGecko
  const btcBars = await fetchBtcDailyUsd(fromUnix, toUnix);
  let btcInserted = 0;
  if (btcBars.length > 0) {
    const rows = btcBars.map((b) => ({
      symbol: "BTC" as const,
      date: b.date,
      value: b.close,
    }));
    const { error } = await db.from("benchmark_prices").upsert(rows, { onConflict: "symbol,date" });
    if (!error) btcInserted = rows.length;
  }

  // 2. Backfill all IDX_TICKERS (parallel batches of 16)
  const concurrency = 16;
  let totalRows = 0;
  let tickersOk = 0;
  let tickersFailed = 0;

  for (let i = 0; i < IDX_TICKERS.length; i += concurrency) {
    const batch = IDX_TICKERS.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (ticker) => {
        const bars = await fetchMarketChart(toYahoo(ticker), fromUnix, toUnix);
        if (bars.length === 0) return { ticker, count: 0 };
        const rows = bars.map((b) => ({
          ticker,
          date: b.date,
          close: b.close,
          source: "yahoo-eod",
        }));
        const { error } = await db.from("eod_prices").upsert(rows, { onConflict: "ticker,date" });
        if (error) throw new Error(error.message);
        return { ticker, count: rows.length };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        totalRows += r.value.count;
        if (r.value.count > 0) tickersOk += 1;
      } else {
        tickersFailed += 1;
      }
    }
  }

  const kbai = await recomputeKbaiRange(db, fromDate, toDate);

  return {
    from: fromDate,
    total_tickers: IDX_TICKERS.length,
    ihsg_days: ihsgInserted,
    gold_days: goldInserted,
    btc_days: btcInserted,
    kbai_days: kbai.kbai_days,
    tickers_ok: tickersOk,
    tickers_failed: tickersFailed,
    total_eod_rows: totalRows,
  };
}

export async function deleteAllMarketData(data: unknown = {}) {
  await requireAdmin();
  void data;

  const db = getAdminDatabaseClient();
  // Use a permissive predicate (delete requires WHERE clause via PostgREST)
  const eod = await db.from("eod_prices").delete().gt("close", -1);
  if (eod.error) throw new Error(`eod: ${eod.error.message}`);
  const bench = await db.from("benchmark_prices").delete().gt("value", -1);
  if (bench.error) throw new Error(`benchmark: ${bench.error.message}`);
  return { ok: true };
}

export async function exportAllMarketData(data: unknown = {}) {
  await requireAdmin();
  void data;

  const db = getAdminDatabaseClient();
  const [eod, bench] = await Promise.all([
    db
      .from("eod_prices")
      .select("date, ticker, close, source")
      .order("date", { ascending: false })
      .limit(100000),
    db
      .from("benchmark_prices")
      .select("date, symbol, value")
      .order("date", { ascending: false })
      .limit(50000),
  ]);
  if (eod.error) throw new Error(eod.error.message);
  if (bench.error) throw new Error(bench.error.message);
  return {
    eod: eod.data ?? [],
    benchmark: bench.data ?? [],
  };
}
