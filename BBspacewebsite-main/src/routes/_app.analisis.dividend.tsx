import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, AlertTriangle } from "lucide-react";
import { ModuleHeader, Disclaimer } from "@/components/analisis-shared";
import { useMutation } from "@tanstack/react-query";
import { runDividendStrategy } from "@/lib/analisis.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analisis/dividend")({
  component: DividendPage,
});

function DividendPage() {
  const [tax, setTax] = useState<"WNI" | "Badan" | "Asing">("WNI");
  const [total, setTotal] = useState("");
  const [monthly, setMonthly] = useState("");
  const m = useMutation({
    mutationFn: () =>
      runDividendStrategy({
        data: {
          total_investment: total || undefined,
          monthly_target: monthly || undefined,
          tax_status: tax,
        },
      }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <ModuleHeader
        role="Chief Investment Strategist"
        title="Dividend Strategy"
        description="15–20 saham dividen terpilih dengan safety score, payout ratio, growth history, dan kalkulator DRIP compounding 5 tahun."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Income Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Investasi (Rp)
              </Label>
              <Input
                className="mt-2"
                placeholder="1.000.000.000"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Target Pendapatan Bulanan (Rp)
              </Label>
              <Input
                className="mt-2"
                placeholder="10.000.000"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Struktur Pajak
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-sm border border-border p-1">
                {(["WNI", "Badan", "Asing"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTax(t)}
                    className={`rounded-sm px-2 py-1.5 text-[11px] font-medium transition ${
                      tax === t
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Coins className="mr-2 h-4 w-4" />
              )}
              {m.isPending ? "Menyusun..." : "Generate Strategy"}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Dividend Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : m.isError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-[12px] text-muted-foreground">{(m.error as Error).message}</p>
              </div>
            ) : m.data ? (
              <DivReport d={m.data} />
            ) : (
              <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">
                Lengkapi parameter untuk strategi dividen.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}

function DivReport({ d }: { d: Awaited<ReturnType<typeof runDividendStrategy>> }) {
  return (
    <div className="space-y-5">
      <p className="text-[12px] leading-relaxed text-foreground/80">{d.summary}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Box label="Income / Bulan" v={fmtIDR(d.monthly_income_idr)} />
        <Box label="Effective Yield" v={`${d.effective_yield_pct.toFixed(2)}%`} />
        <Box label="DRIP 5Y Value" v={fmtIDR(d.drip_5y_value_idr)} />
      </div>
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Dividend Portfolio
        </div>
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-[12px]">
            <thead className="bg-card/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">Ticker</th>
                <th className="px-2 py-1.5 text-left">Name</th>
                <th className="px-2 py-1.5 text-right">Yield</th>
                <th className="px-2 py-1.5 text-right">Payout</th>
                <th className="px-2 py-1.5 text-right">Safety</th>
                <th className="px-2 py-1.5 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {d.portfolio.map((p) => (
                <tr key={p.ticker} className="border-t border-border">
                  <td className="px-2 py-1.5 font-mono font-semibold">{p.ticker}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{p.name}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-pos">
                    {p.yield_pct.toFixed(2)}%
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {p.payout_ratio_pct.toFixed(0)}%
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {p.safety_score.toFixed(0)}/10
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {p.weight_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Sector Mix
        </div>
        <div className="space-y-1.5">
          {d.sector_mix.map((s) => (
            <div key={s.sector} className="flex items-center gap-3">
              <div className="w-32 truncate text-[12px]">{s.sector}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-sm bg-border">
                <div className="h-full bg-foreground/70" style={{ width: `${s.weight_pct}%` }} />
              </div>
              <div className="w-12 text-right font-mono text-[11px] tabular-nums">
                {s.weight_pct.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Box({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/50 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-serif text-base font-semibold tabular-nums">{v}</div>
    </div>
  );
}
