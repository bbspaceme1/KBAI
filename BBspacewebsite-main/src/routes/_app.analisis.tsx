import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Calculator,
  TrendingUp,
  Briefcase,
  Activity,
  Coins,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/analisis")({
  component: AnalisisLayout,
});

const MODULES = [
  {
    to: "/analisis/screener",
    label: "Stock Screener",
    role: "Senior Equity Analyst",
    desc: "Filter saham IDX berdasarkan profil risiko, sektor, dan horizon investasi.",
    icon: Search,
  },
  {
    to: "/analisis/valuation",
    label: "DCF Valuation",
    role: "VP Investment Banking",
    desc: "Discounted Cash Flow dengan WACC, terminal value, dan sensitivity matrix.",
    icon: Calculator,
  },
  {
    to: "/analisis/earnings",
    label: "Earnings Analysis",
    role: "Equity Research Analyst",
    desc: "Pre-earnings brief: beat/miss history, consensus, dan implied move.",
    icon: TrendingUp,
  },
  {
    to: "/analisis/portfolio",
    label: "Portfolio Construction",
    role: "Senior Portfolio Strategist",
    desc: "Asset allocation, rebalancing rules, dan Investment Policy Statement.",
    icon: Briefcase,
  },
  {
    to: "/analisis/technical",
    label: "Technical Analysis",
    role: "Quantitative Trader",
    desc: "Multi-timeframe trend, support/resistance, indikator, dan trade plan.",
    icon: Activity,
  },
  {
    to: "/analisis/dividend",
    label: "Dividend Strategy",
    role: "Chief Investment Strategist",
    desc: "Saham dividen dengan safety score, DRIP compounding, dan proyeksi income.",
    icon: Coins,
  },
] as const;

function AnalisisLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHub = pathname === "/analisis" || pathname === "/analisis/";

  return (
    <div className="space-y-6">
      {/* Sub-nav strip */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-2">
        <Link
          to="/analisis"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          )}
          activeProps={{ className: "bg-accent text-foreground" }}
          activeOptions={{ exact: true }}
        >
          <LineChart className="h-3.5 w-3.5" />
          Overview
        </Link>
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap"
            activeProps={{ className: "bg-accent text-foreground" }}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </Link>
        ))}
      </div>

      {isHub ? <AnalisisHub /> : <Outlet />}
    </div>
  );
}

function AnalisisHub() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="border-b border-border pb-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Equity Intelligence Platform
        </div>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Research like a senior analyst.
          <br />
          <span className="text-muted-foreground">Decide like an institution.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Enam modul analisis berbasis framework institusional — dari DCF valuation, stock
          screening, hingga dividend strategy. Dibangun untuk advisor yang membutuhkan presisi
          setara desk research bank investasi.
        </p>
      </div>

      {/* Module grid 2×3 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="group">
            <Card className="h-full border-border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg">
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-accent">
                    <m.icon className="h-4 w-4 text-foreground" />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {m.role}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg font-semibold leading-tight tracking-tight">
                    {m.label}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    {m.desc}
                  </p>
                </div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground/70 group-hover:text-foreground">
                  Buka modul →
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div className="border-t border-border pt-6">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          How It Works
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { n: "01", t: "Input", d: "Isi parameter analisis (ticker, profil risiko, horizon)." },
            { n: "02", t: "Analisis", d: "Framework institusional memproses & memodelkan." },
            { n: "03", t: "Laporan", d: "Output siap-baca dengan verdict, target, dan risiko." },
          ].map((s) => (
            <div key={s.n} className="rounded-sm border border-border bg-card p-4">
              <div className="font-mono text-[11px] text-muted-foreground">{s.n}</div>
              <div className="mt-1 font-serif text-base font-semibold">{s.t}</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground">
        Informasi yang disajikan hanya untuk tujuan edukasi dan riset. Bukan merupakan rekomendasi
        investasi. Selalu konsultasikan keputusan investasi dengan penasihat keuangan berlisensi.
      </p>
    </div>
  );
}
