import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/insight")({
  component: InsightPage,
});

function InsightPage() {
  const profilesQ = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username");
      if (error) throw error;
      return data ?? [];
    },
  });
  const holdingsQ = useQuery({
    queryKey: ["admin-all-holdings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("holdings").select("*").gt("total_lot", 0);
      if (error) throw error;
      return data ?? [];
    },
  });
  const cashQ = useQuery({
    queryKey: ["admin-all-cash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_balances").select("user_id, balance");
      if (error) throw error;
      return data ?? [];
    },
  });
  const pricesQ = useQuery({
    queryKey: ["admin-all-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eod_prices")
        .select("ticker, close, date")
        .order("date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const p of data ?? []) {
        if (!map.has(p.ticker)) map.set(p.ticker, Number(p.close));
      }
      return map;
    },
  });

  const [selectedUser, setSelectedUser] = useState<string>("");

  // Community-level allocation
  const communityAlloc = useMemo(() => {
    const agg = new Map<string, { value: number; cost: number }>();
    for (const h of holdingsQ.data ?? []) {
      const last = pricesQ.data?.get(h.ticker) ?? Number(h.avg_price);
      const value = last * h.total_lot * 100;
      const cost = Number(h.avg_price) * h.total_lot * 100;
      const cur = agg.get(h.ticker) ?? { value: 0, cost: 0 };
      cur.value += value;
      cur.cost += cost;
      agg.set(h.ticker, cur);
    }
    const total = Array.from(agg.values()).reduce((s, x) => s + x.value, 0);
    const totalCost = Array.from(agg.values()).reduce((s, x) => s + x.cost, 0);
    const arr = Array.from(agg.entries())
      .map(([t, v]) => ({ ticker: t, ...v, pct: total > 0 ? (v.value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    return { rows: arr, total, totalCost };
  }, [holdingsQ.data, pricesQ.data]);

  const communityInsight = buildInsight(
    communityAlloc.rows,
    communityAlloc.totalCost > 0
      ? ((communityAlloc.total - communityAlloc.totalCost) / communityAlloc.totalCost) * 100
      : 0,
    "community",
  );

  // Per-user allocation
  const userInsight = useMemo(() => {
    if (!selectedUser) return null;
    const userHoldings = (holdingsQ.data ?? []).filter((h) => h.user_id === selectedUser);
    const cash = (cashQ.data ?? []).find((c) => c.user_id === selectedUser);
    const cashAmt = cash ? Number(cash.balance) : 0;
    const agg = new Map<string, { value: number; cost: number }>();
    for (const h of userHoldings) {
      const last = pricesQ.data?.get(h.ticker) ?? Number(h.avg_price);
      const value = last * h.total_lot * 100;
      const cost = Number(h.avg_price) * h.total_lot * 100;
      const cur = agg.get(h.ticker) ?? { value: 0, cost: 0 };
      cur.value += value;
      cur.cost += cost;
      agg.set(h.ticker, cur);
    }
    const total = Array.from(agg.values()).reduce((s, x) => s + x.value, 0);
    const totalCost = Array.from(agg.values()).reduce((s, x) => s + x.cost, 0);
    const equity = total + cashAmt;
    const rows = Array.from(agg.entries())
      .map(([t, v]) => ({ ticker: t, ...v, pct: equity > 0 ? (v.value / equity) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    const username = profilesQ.data?.find((p) => p.id === selectedUser)?.username ?? "";
    return {
      rows,
      total,
      totalCost,
      equity,
      cash: cashAmt,
      pl: total - totalCost,
      plPct: totalCost > 0 ? ((total - totalCost) / totalCost) * 100 : 0,
      username,
      cashPct: equity > 0 ? (cashAmt / equity) * 100 : 0,
    };
  }, [selectedUser, holdingsQ.data, cashQ.data, pricesQ.data, profilesQ.data]);

  const perUserInsight = userInsight
    ? buildInsight(userInsight.rows, userInsight.plPct, "user", userInsight.cashPct)
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Community */}
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            Insight Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Aggregate dari semua user · {communityAlloc.rows.length} ticker
          </div>
          {communityInsight.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Belum cukup data komunitas.</p>
          ) : (
            communityInsight.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className={
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full " +
                    (line.tone === "pos"
                      ? "bg-pos"
                      : line.tone === "neg"
                        ? "bg-neg"
                        : "bg-muted-foreground")
                  }
                />
                <p className="text-[13px] leading-relaxed text-foreground/85">{line.text}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Per-user */}
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3 space-y-2">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            Insight User {userInsight?.username && `· ${userInsight.username}`}
          </CardTitle>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="h-9 rounded-sm">
              <SelectValue placeholder="Pilih user untuk dianalisis" />
            </SelectTrigger>
            <SelectContent>
              {(profilesQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {!selectedUser ? (
            <p className="text-[13px] text-muted-foreground">
              Pilih user di atas untuk melihat insight personal.
            </p>
          ) : userInsight && userInsight.rows.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">User ini belum punya holding.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 border-b border-border pb-4 text-[12px]">
                <div>
                  <span className="text-muted-foreground">P/L: </span>
                  <span className={userInsight!.pl >= 0 ? "text-pos" : "text-neg"}>
                    {fmtPct(userInsight!.plPct)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cash %: </span>
                  {userInsight!.cashPct.toFixed(1)}%
                </div>
              </div>
              {perUserInsight.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span
                    className={
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full " +
                      (line.tone === "pos"
                        ? "bg-pos"
                        : line.tone === "neg"
                          ? "bg-neg"
                          : "bg-muted-foreground")
                    }
                  />
                  <p className="text-[13px] leading-relaxed text-foreground/85">{line.text}</p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildInsight(
  alloc: { ticker: string; pct: number }[],
  plPct: number,
  scope: "community" | "user",
  cashPct?: number,
): { text: string; tone?: "pos" | "neg" }[] {
  const out: { text: string; tone?: "pos" | "neg" }[] = [];
  if (alloc.length === 0) return out;
  const top = alloc[0];
  if (top && top.pct >= 25) {
    out.push({
      text: `Konsentrasi tinggi pada ${top.ticker} (${top.pct.toFixed(1)}%). Pertimbangkan diversifikasi.`,
      tone: "neg",
    });
  } else if (top) {
    out.push({
      text: `Top holding: ${top.ticker} (${top.pct.toFixed(1)}%). Distribusi sehat.`,
      tone: "pos",
    });
  }
  const top3 = alloc.slice(0, 3).reduce((s, r) => s + r.pct, 0);
  out.push({
    text: `Top-3 ticker mengisi ${top3.toFixed(1)}% dari ${scope === "community" ? "pool komunitas" : "equity user"}.`,
  });
  out.push({
    text: `Aggregate unrealized P/L ${plPct >= 0 ? "+" : ""}${plPct.toFixed(2)}%.`,
    tone: plPct >= 0 ? "pos" : "neg",
  });
  if (scope === "user" && typeof cashPct === "number") {
    if (cashPct > 30)
      out.push({
        text: `Cash ratio ${cashPct.toFixed(1)}% tergolong tinggi — peluang deploy ke posisi baru.`,
      });
    else if (cashPct < 5)
      out.push({
        text: `Cash ratio rendah (${cashPct.toFixed(1)}%) — buffer terbatas untuk peluang.`,
        tone: "neg",
      });
  }
  return out;
}
