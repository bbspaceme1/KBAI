import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { ModuleHeader, Disclaimer } from "@/components/analisis-shared";
import { useMutation } from "@tanstack/react-query";
import { runEarningsBrief } from "@/lib/analisis.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analisis/earnings")({
  component: EarningsPage,
});

function EarningsPage() {
  const [company, setCompany] = useState("");
  const [date, setDate] = useState("");
  const m = useMutation({
    mutationFn: () => runEarningsBrief({ company, release_date: date || undefined }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <ModuleHeader
        role="Senior Equity Research Analyst"
        title="Earnings Analysis"
        description="Pre-earnings brief: rekomendasi Beli/Jual/Tunggu, beat/miss history 4 kuartal, consensus, segment breakdown, dan implied move dari pasar opsi."
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
                Nama Perusahaan
              </Label>
              <Input
                className="mt-2"
                placeholder="PT Bank Central Asia Tbk"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Tanggal Rilis (opsional)
              </Label>
              <Input
                type="date"
                className="mt-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => m.mutate()}
              disabled={!company || m.isPending}
            >
              {m.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="mr-2 h-4 w-4" />
              )}
              {m.isPending ? "Menyusun..." : "Generate Brief"}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Pre-Earnings Brief
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
              <EarningsReport d={m.data} />
            ) : (
              <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">
                Masukkan emiten untuk membuat earnings brief.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}

function EarningsReport({ d }: { d: Awaited<ReturnType<typeof runEarningsBrief>> }) {
  const tone =
    d.decision === "BELI"
      ? "text-pos border-pos/40"
      : d.decision === "JUAL"
        ? "text-neg border-neg/40"
        : "text-foreground border-border";
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={`rounded-sm border px-3 py-2 ${tone}`}>
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Decision</div>
          <div className="mt-0.5 font-serif text-base font-semibold">{d.decision}</div>
        </div>
        <Stat label="Confidence" value={`${d.confidence}%`} />
        <Stat label="Implied Move" value={`±${d.implied_move_pct.toFixed(1)}%`} />
        <Stat label="Consensus EPS" value={d.consensus_eps.toString()} />
      </div>
      <p className="text-[12px] leading-relaxed text-foreground/80">{d.narrative}</p>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Beat / Miss (4Q)
        </div>
        <div className="flex items-end gap-3">
          {d.beat_miss.map((q) => {
            const max = Math.max(...d.beat_miss.map((x) => Math.abs(x.surprise_pct)), 1);
            const h = Math.max(8, (Math.abs(q.surprise_pct) / max) * 70);
            return (
              <div key={q.quarter} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm ${q.surprise_pct >= 0 ? "bg-pos/70" : "bg-neg/70"}`}
                  style={{ height: `${h}px` }}
                />
                <div className="font-mono text-[10px] text-muted-foreground">{q.quarter}</div>
                <div
                  className={`font-mono text-[10px] tabular-nums ${q.surprise_pct >= 0 ? "text-pos" : "text-neg"}`}
                >
                  {q.surprise_pct >= 0 ? "+" : ""}
                  {q.surprise_pct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Bull Case
          </div>
          <p className="rounded-sm border border-pos/30 bg-pos/5 p-3 text-[12px] leading-relaxed">
            {d.bull_case}
          </p>
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Bear Case
          </div>
          <p className="rounded-sm border border-neg/30 bg-neg/5 p-3 text-[12px] leading-relaxed">
            {d.bear_case}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Segment Mix
        </div>
        <div className="space-y-1.5">
          {d.segments.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <div className="w-32 truncate text-[12px]">{s.name}</div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/50 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-serif text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
