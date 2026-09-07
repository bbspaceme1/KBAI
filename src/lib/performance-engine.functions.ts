import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Snapshot = { date: string; total_value: number };
type CashFlow = { flow_date: string; amount: number };

export function calculateTwrFromSeries(snapshots: Snapshot[], cashFlows: CashFlow[]) {
  if (snapshots.length < 2) return null;
  const flows = new Map(cashFlows.map((flow) => [flow.flow_date, flow.amount]));
  let linked = 1;
  for (let index = 1; index < snapshots.length; index += 1) {
    const start = snapshots[index - 1].total_value;
    if (start <= 0) continue;
    // Convention: a flow dated on the ending snapshot is treated as occurring
    // immediately before that valuation, so it is removed from ending wealth.
    const endingFlow = flows.get(snapshots[index].date) ?? 0;
    linked *= (snapshots[index].total_value - endingFlow) / start;
  }
  return linked - 1;
}

export function calculateXirrFromFlows(flows: Array<{ date: string; amount: number }>) {
  if (flows.length < 2) return null;
  const origin = Date.parse(flows[0].date);
  const yearFraction = (date: string) => (Date.parse(date) - origin) / 86_400_000 / 365;
  const npv = (rate: number) => flows.reduce((sum, flow) => sum + flow.amount / (1 + rate) ** yearFraction(flow.date), 0);
  const derivative = (rate: number) => flows.reduce((sum, flow) => {
    const t = yearFraction(flow.date);
    return sum - (t * flow.amount) / (1 + rate) ** (t + 1);
  }, 0);
  let rate = 0.1;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const value = npv(rate);
    const slope = derivative(rate);
    if (!Number.isFinite(value) || !Number.isFinite(slope) || Math.abs(slope) < 1e-12) return null;
    const next = rate - value / slope;
    if (next <= -0.999999 || !Number.isFinite(next)) return null;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }
  return null;
}

export function calculateDrawdownFromSeries(values: number[]) {
  let peak = 0;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    currentDrawdown = peak > 0 ? (peak - value) / peak : 0;
    maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
  }
  return { maxDrawdown, currentDrawdown };
}

export function calculateAlpha(userTwr: number | null, benchmarkReturn: number | null) {
  return userTwr == null || benchmarkReturn == null ? null : userTwr - benchmarkReturn;
}

export async function getPortfolioPerformanceSummary(userId: string, fromDate: string, toDate: string, benchmarkSymbol = "IHSG") {
  const db = supabaseAdmin as any;
  const [{ data: snapshots, error: snapshotError }, { data: cashFlows, error: flowError }] = await Promise.all([
    db.from("portfolio_snapshots").select("date,total_value").eq("user_id", userId).gte("date", fromDate).lte("date", toDate).order("date"),
    db.from("portfolio_cash_flows").select("flow_date,amount").eq("user_id", userId).gte("flow_date", fromDate).lte("flow_date", toDate).order("flow_date"),
  ]);
  if (snapshotError) throw new Error(snapshotError.message);
  if (flowError) throw new Error(flowError.message);
  const series = (snapshots ?? []) as Snapshot[];
  const flows = (cashFlows ?? []) as CashFlow[];
  const twr = calculateTwrFromSeries(series, flows);
  const latestValue = series.at(-1)?.total_value;
  const xirrFlows = flows.map((flow) => ({ date: flow.flow_date, amount: -flow.amount })).concat(
    latestValue == null ? [] : [{ date: toDate, amount: latestValue }],
  );
  const xirr = calculateXirrFromFlows(xirrFlows);
  const drawdown = calculateDrawdownFromSeries(series.map((item) => item.total_value));
  const { data: benchmark } = await db.from("benchmark_base100_series").select("normalized_value").eq("benchmark_symbol", benchmarkSymbol).eq("period_start_date", fromDate).gte("as_of_date", fromDate).lte("as_of_date", toDate).order("as_of_date");
  const benchmarkReturn = benchmark?.length ? benchmark.at(-1).normalized_value / 100 - 1 : null;
  return { twr, xirr, ...drawdown, benchmarkComparison: [{ symbol: benchmarkSymbol, return: benchmarkReturn }], alpha: calculateAlpha(twr, benchmarkReturn) };
}
