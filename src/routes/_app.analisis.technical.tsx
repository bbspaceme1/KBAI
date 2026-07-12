import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Loader2, AlertTriangle } from "lucide-react";
import { ModuleHeader, Disclaimer } from "@/components/analisis-shared";
import { useMutation } from "@tanstack/react-query";
import { runTechnicalAnalysis } from "@/lib/analisis.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNum } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analisis/technical")({
  component: TechnicalPage,
});

function TechnicalPage() {
  const [ticker, setTicker] = useState("");
  const [pos, setPos] = useState<"None" | "Long" | "Short">("None");
  const m = useMutation({
    mutationFn: () => runTechnicalAnalysis({ ticker, position: pos }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <ModuleHeader
        role="Quantitative Trader"
        title="Technical Analysis"
        description="Multi-timeframe trend analysis, support/resistance, indikator (MA, RSI, MACD, BB), Fibonacci, dan trade plan dengan confidence level."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ticker
              </Label>
              <Input
                className="mt-2 font-mono uppercase"
                placeholder="TLKM"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Posisi Saat Ini
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-sm border border-border p-1">
                {(["None", "Long", "Short"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPos(p)}
                    className={`rounded-sm px-2 py-1.5 text-[11px] font-medium transition ${
                      pos === p
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => m.mutate()} disabled={!ticker || m.isPending}>
              {m.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Activity className="mr-2 h-4 w-4" />
              )}
              {m.isPending ? "Menganalisis..." : "Run Analysis"}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Technical Output
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
              <TechReport d={m.data} />
            ) : (
              <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">
                Masukkan ticker untuk analisis teknikal multi-timeframe.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}

function TechReport({ d }: { d: Awaited<ReturnType<typeof runTechnicalAnalysis>> }) {
  const tone =
    d.bias === "BULLISH"
      ? "text-pos border-pos/40"
      : d.bias === "BEARISH"
        ? "text-neg border-neg/40"
        : "text-foreground border-border";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={`rounded-sm border px-3 py-2 ${tone}`}>
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Bias</div>
          <div className="mt-0.5 font-serif text-base font-semibold">{d.bias}</div>
        </div>
        <Box label="Confidence" v={`${d.confidence}%`} />
        <Box label="Entry" v={fmtNum(d.trade_plan.entry, 0)} />
        <Box label="R/R" v={`${d.trade_plan.rr.toFixed(2)}x`} />
      </div>
      <p className="text-[12px] leading-relaxed text-foreground/80">{d.narrative}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {d.trend.map((t) => (
          <div key={t.tf} className="rounded-sm border border-border p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.tf}
            </div>
            <div className="mt-1 font-serif text-base font-semibold">{t.direction}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Support / Resistance
          </div>
          <div className="space-y-1 text-[12px]">
            <div>
              Resistance:{" "}
              <span className="font-mono text-neg">
                {d.resistance.map((r) => fmtNum(r, 0)).join(" · ")}
              </span>
            </div>
            <div>
              Support:{" "}
              <span className="font-mono text-pos">
                {d.support.map((r) => fmtNum(r, 0)).join(" · ")}
              </span>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Indicators
          </div>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-[11px]">
              <tbody>
                {d.indicators.map((i, k) => (
                  <tr key={k} className="border-t border-border first:border-t-0">
                    <td className="px-2 py-1 font-mono">{i.name}</td>
                    <td className="px-2 py-1 tabular-nums">{i.value}</td>
                    <td className="px-2 py-1 text-right text-muted-foreground">{i.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Trade Plan
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] md:grid-cols-4">
          <div>
            Action: <span className="font-semibold">{d.trade_plan.action}</span>
          </div>
          <div>
            Entry: <span className="font-mono">{fmtNum(d.trade_plan.entry, 0)}</span>
          </div>
          <div>
            SL: <span className="font-mono text-neg">{fmtNum(d.trade_plan.stop_loss, 0)}</span>
          </div>
          <div>
            TP: <span className="font-mono text-pos">{fmtNum(d.trade_plan.take_profit, 0)}</span>
          </div>
        </div>
        {d.patterns.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.patterns.map((p) => (
              <span
                key={p}
                className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        )}
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
