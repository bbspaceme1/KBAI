import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Loader2, AlertTriangle } from "lucide-react";
import { ModuleHeader, Disclaimer } from "@/components/analisis-shared";
import { useMutation } from "@tanstack/react-query";
import { runDcfValuation } from "@/lib/analisis.functions";
import { fmtIDR, fmtNum } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analisis/valuation")({
  component: ValuationPage,
});

function ValuationPage() {
  const [ticker, setTicker] = useState("");
  const [company, setCompany] = useState("");
  const mutation = useMutation({
    mutationFn: () => runDcfValuation({ ticker, company_name: company || undefined }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      <ModuleHeader
        role="VP Investment Banking"
        title="DCF Valuation"
        description="Discounted Cash Flow dengan WACC, terminal value (Exit Multiple & Perpetuity Growth), serta sensitivity heatmap untuk verdict intrinsic value."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Input Saham
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ticker
              </Label>
              <Input
                className="mt-2 font-mono uppercase"
                placeholder="BBCA"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Nama Perusahaan
              </Label>
              <Input
                className="mt-2"
                placeholder="Auto-fill dari ticker"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => mutation.mutate()}
              disabled={!ticker || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              {mutation.isPending ? "Menghitung..." : "Generate Valuation"}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              DCF Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mutation.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : mutation.isError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-[12px] text-muted-foreground">
                  {(mutation.error as Error).message}
                </p>
              </div>
            ) : mutation.data ? (
              <DcfReport data={mutation.data} />
            ) : (
              <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">
                Masukkan ticker untuk memulai DCF.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}

function DcfReport({ data }: { data: Awaited<ReturnType<typeof runDcfValuation>> }) {
  const verdictColor =
    data.verdict === "UNDERVALUED"
      ? "text-pos border-pos/40"
      : data.verdict === "OVERVALUED"
        ? "text-neg border-neg/40"
        : "text-foreground border-border";
  return (
    <div className="space-y-5">
      {/* Verdict */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Harga Pasar" value={fmtIDR(data.current_price)} />
        <Stat label="Intrinsic Value" value={fmtIDR(data.intrinsic_value)} />
        <Stat
          label="Upside"
          value={`${data.upside_pct >= 0 ? "+" : ""}${data.upside_pct.toFixed(1)}%`}
        />
        <div className={`rounded-sm border px-3 py-2 ${verdictColor}`}>
          <div className="font-mono text-[10px] uppercase tracking-wider opacity-70">Verdict</div>
          <div className="mt-0.5 font-serif text-base font-semibold">{data.verdict}</div>
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-foreground/80">{data.narrative}</p>

      {/* FCF projection */}
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          FCF Projection (Rp Miliar)
        </div>
        <div className="flex items-end gap-2">
          {data.fcf_projection.map((p) => {
            const max = Math.max(...data.fcf_projection.map((x) => x.fcf));
            const h = Math.max(8, (p.fcf / max) * 80);
            return (
              <div key={p.year} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-sm bg-foreground/70" style={{ height: `${h}px` }} />
                <div className="font-mono text-[10px] text-muted-foreground">{p.year}</div>
                <div className="font-mono text-[10px] tabular-nums">{fmtNum(p.fcf, 0)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WACC + Sensitivity */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Asumsi
          </div>
          <div className="space-y-1 text-[12px]">
            <div>
              WACC: <span className="font-mono">{data.wacc.toFixed(2)}%</span>
            </div>
            <div>
              Terminal Growth: <span className="font-mono">{data.terminal_growth.toFixed(2)}%</span>
            </div>
            <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
              {data.assumptions.slice(0, 5).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Sensitivity (WACC × Growth)
          </div>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-[11px]">
              <tbody>
                {data.sensitivity.map((s, i) => (
                  <tr key={i} className="border-t border-border first:border-t-0">
                    <td className="px-2 py-1 font-mono">{s.wacc.toFixed(1)}%</td>
                    <td className="px-2 py-1 font-mono text-muted-foreground">
                      {s.growth.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {fmtIDR(s.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
