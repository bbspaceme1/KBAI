import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Briefcase, Loader2, AlertTriangle } from "lucide-react";
import { ModuleHeader, Disclaimer } from "@/components/analisis-shared";
import { useMutation } from "@tanstack/react-query";
import { runPortfolioConstruction } from "@/lib/analisis.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analisis/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const [age, setAge] = useState([35]);
  const [risk, setRisk] = useState([5]);
  const [income, setIncome] = useState("");
  const [assets, setAssets] = useState("");
  const m = useMutation({
    mutationFn: () =>
      runPortfolioConstruction({
        data: {
          age: age[0],
          risk_score: risk[0],
          annual_income: income || undefined,
          total_assets: assets || undefined,
        },
      }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <ModuleHeader
        role="Senior Portfolio Strategist"
        title="Portfolio Construction"
        description="Multi-asset allocation berbasis usia, tujuan, dan toleransi risiko. Dengan rebalancing rules, DCA strategy, dan Investment Policy Statement."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Profil Investor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Usia: {age[0]} tahun
              </Label>
              <Slider
                value={age}
                onValueChange={setAge}
                min={18}
                max={75}
                step={1}
                className="mt-3"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Pendapatan Tahunan (Rp)
              </Label>
              <Input
                className="mt-2"
                placeholder="500.000.000"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Aset (Rp)
              </Label>
              <Input
                className="mt-2"
                placeholder="2.000.000.000"
                value={assets}
                onChange={(e) => setAssets(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Toleransi Risiko: {risk[0]}/10
              </Label>
              <Slider
                value={risk}
                onValueChange={setRisk}
                min={1}
                max={10}
                step={1}
                className="mt-3"
              />
            </div>
            <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Briefcase className="mr-2 h-4 w-4" />
              )}
              {m.isPending ? "Membangun..." : "Build Portfolio"}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Allocation Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : m.isError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-[12px] text-muted-foreground">{(m.error as Error).message}</p>
              </div>
            ) : m.data ? (
              <PortReport d={m.data} />
            ) : (
              <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">
                Lengkapi profil untuk konstruksi portofolio.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}

function PortReport({ d }: { d: Awaited<ReturnType<typeof runPortfolioConstruction>> }) {
  return (
    <div className="space-y-5">
      <p className="text-[12px] leading-relaxed text-foreground/80">{d.summary}</p>
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Asset Allocation
        </div>
        <div className="space-y-1.5">
          {d.allocation.map((a) => (
            <div key={a.asset_class}>
              <div className="flex items-center gap-3">
                <div className="w-40 truncate text-[12px]">{a.asset_class}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-sm bg-border">
                  <div className="h-full bg-foreground/70" style={{ width: `${a.weight_pct}%` }} />
                </div>
                <div className="w-12 text-right font-mono text-[11px] tabular-nums">
                  {a.weight_pct.toFixed(0)}%
                </div>
              </div>
              <div className="ml-40 pl-3 text-[11px] text-muted-foreground">{a.rationale}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Core / Satellite
        </div>
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-[12px]">
            <thead className="bg-card/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">Bucket</th>
                <th className="px-2 py-1.5 text-left">Ticker</th>
                <th className="px-2 py-1.5 text-right">Weight</th>
                <th className="px-2 py-1.5 text-left">Thesis</th>
              </tr>
            </thead>
            <tbody>
              {d.core_satellite.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] ${r.bucket === "Core" ? "border-foreground/40" : "border-muted-foreground/30 text-muted-foreground"}`}
                    >
                      {r.bucket}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono">{r.ticker}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {r.weight_pct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.thesis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-sm border border-border p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Rebalancing
          </div>
          <p className="mt-1 text-[12px]">{d.rebalancing}</p>
        </div>
        <div className="rounded-sm border border-border p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            DCA Strategy
          </div>
          <p className="mt-1 text-[12px]">{d.dca}</p>
        </div>
        <div className="rounded-sm border border-border p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Max Drawdown (est.)
          </div>
          <p className="mt-1 font-serif text-xl font-semibold tabular-nums text-neg">
            -{d.max_drawdown_pct.toFixed(0)}%
          </p>
        </div>
      </div>
      <div className="rounded-sm border border-border bg-card/40 p-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Investment Policy Statement
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed">{d.ips}</p>
      </div>
    </div>
  );
}
