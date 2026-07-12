import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, AlertTriangle } from "lucide-react";
import { ModuleHeader, Disclaimer } from "@/components/analisis-shared";
import { useMutation } from "@tanstack/react-query";
import { runStockScreener } from "@/lib/analisis.functions";
import { fmtNum } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analisis/screener")({
  component: ScreenerPage,
});

const SECTORS = [
  "Perbankan",
  "Energi",
  "Konsumer",
  "Telco",
  "Properti",
  "Tambang",
  "Infrastruktur",
  "Healthcare",
];

function ScreenerPage() {
  const [risk, setRisk] = useState<"Conservative" | "Moderate" | "Aggressive">("Moderate");
  const [horizon, setHorizon] = useState([5]);
  const [amount, setAmount] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      runStockScreener({
        data: { risk, horizon_years: horizon[0], sectors, amount: amount || undefined },
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        role="Senior Equity Analyst"
        title="Stock Screener"
        description="Filter saham IDX berdasarkan profil risiko, jumlah investasi, horizon, dan preferensi sektor."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Input Parameter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Profil Risiko
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-sm border border-border p-1">
                {(["Conservative", "Moderate", "Aggressive"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={`rounded-sm px-2 py-1.5 text-[11px] font-medium transition ${
                      risk === r
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Jumlah Investasi (Rp)
              </Label>
              <Input
                className="mt-2"
                placeholder="100.000.000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Horizon: {horizon[0]} tahun
              </Label>
              <Slider
                value={horizon}
                onValueChange={setHorizon}
                min={1}
                max={10}
                step={1}
                className="mt-3"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Preferensi Sektor
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SECTORS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-[12px]">
                    <Checkbox
                      checked={sectors.includes(s)}
                      onCheckedChange={(v) =>
                        setSectors((cur) => (v ? [...cur, s] : cur.filter((x) => x !== s)))
                      }
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {mutation.isPending ? "Menyaring..." : "Generate Report"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Hasil Screening
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mutation.isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : mutation.isError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-[12px] text-muted-foreground">
                  {(mutation.error as Error).message}
                </p>
              </div>
            ) : mutation.data ? (
              <div className="space-y-4">
                <p className="text-[12px] leading-relaxed text-foreground/80">
                  {mutation.data.summary}
                </p>
                <div className="overflow-x-auto rounded-sm border border-border">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">Ticker</th>
                        <th className="px-3 py-2">Nama / Sektor</th>
                        <th className="px-3 py-2 text-right">P/E</th>
                        <th className="px-3 py-2 text-right">ROE%</th>
                        <th className="px-3 py-2 text-right">Growth%</th>
                        <th className="px-3 py-2 text-right">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mutation.data.tickers.map((t) => (
                        <tr key={t.ticker} className="border-t border-border align-top">
                          <td className="px-3 py-2 font-mono font-semibold">{t.ticker}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{t.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {t.sector}
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {t.thesis}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtNum(t.pe, 1)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmtNum(t.roe, 1)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {fmtNum(t.growth, 1)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-block rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px]">
                              {t.risk_score}/10
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-[12px] text-muted-foreground">
                Isi parameter di kiri, lalu generate untuk melihat 10 saham hasil screening.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Disclaimer />
    </div>
  );
}
