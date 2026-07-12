import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMacroSnapshot, getGlobalQuotes } from "@/lib/ekonomi.functions";
import { DataState } from "@/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export const Route = createFileRoute("/_app/ekonomi/")({
  component: EkonomiDashboard,
});

function EkonomiDashboard() {
  const fetchMacro = getMacroSnapshot;
  const fetchGlobal = getGlobalQuotes;

  const macroQ = useQuery({
    queryKey: ["ekonomi-macro", "IDN"],
    queryFn: () => fetchMacro({ country: "IDN" }),
    staleTime: 1000 * 60 * 60,
  });

  const globalQ = useQuery({
    queryKey: ["ekonomi-global"],
    queryFn: () => fetchGlobal(),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Indikator Makro Indonesia (World Bank)
        </h2>
        <DataState
          isLoading={macroQ.isLoading}
          isError={macroQ.isError}
          error={macroQ.error}
          data={macroQ.data}
          onRetry={() => macroQ.refetch()}
          isEmpty={(d) => !d.gdpGrowth.length}
          skeletonRows={2}
        >
          {(d) => {
            const last = <T extends { value: number; year: number }>(arr: T[]) =>
              arr[arr.length - 1];
            const cards = [
              { label: "GDP Growth", v: last(d.gdpGrowth), unit: "%", invert: false },
              { label: "Inflation (CPI)", v: last(d.cpi), unit: "%", invert: true },
              { label: "Unemployment", v: last(d.unemployment), unit: "%", invert: true },
              {
                label: "Current Account",
                v: last(d.currentAccountPctGdp),
                unit: "% GDP",
                invert: false,
              },
              {
                label: "FX Reserves",
                v: last(d.reservesUsd),
                unit: "USD",
                invert: false,
                fmt: (n: number) => `$${(n / 1e9).toFixed(1)}B`,
              },
              {
                label: "GDP Total",
                v: last(d.gdpUsd),
                unit: "USD",
                invert: false,
                fmt: (n: number) => `$${(n / 1e12).toFixed(2)}T`,
              },
            ];
            return (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
                {cards.map((c) => (
                  <div key={c.label} className="bg-card p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums">
                      {c.v
                        ? c.fmt
                          ? c.fmt(c.v.value)
                          : `${fmtNum(c.v.value, 2)}${c.unit === "%" ? "%" : ""}`
                        : "—"}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {c.v ? `Per ${c.v.year}` : c.unit}
                    </div>
                  </div>
                ))}
              </div>
            );
          }}
        </DataState>
      </section>

      <section>
        <h2 className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Global Markets Snapshot
        </h2>
        <DataState
          isLoading={globalQ.isLoading}
          isError={globalQ.isError}
          error={globalQ.error}
          data={globalQ.data}
          onRetry={() => globalQ.refetch()}
          isEmpty={(d) => d.items.every((i) => i.price == null)}
          skeletonRows={3}
        >
          {(d) => (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  {d.items.length} instrumen · auto-refresh 5 menit
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 text-left">Instrumen</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {d.items.map((it) => {
                      const Icon =
                        it.pctChange == null ? Minus : it.pctChange >= 0 ? ArrowUp : ArrowDown;
                      const color =
                        it.pctChange == null
                          ? "text-muted-foreground"
                          : it.pctChange >= 0
                            ? "text-pos"
                            : "text-neg";
                      return (
                        <tr key={it.symbol} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2">
                            <div className="text-sm font-medium">{it.name}</div>
                            <div className="font-mono text-[10px] uppercase text-muted-foreground">
                              {it.symbol}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {it.price != null ? fmtNum(it.price, 2) : "—"}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-mono", color)}>
                            {it.pctChange != null ? (
                              <span className="inline-flex items-center justify-end gap-1">
                                <Icon className="h-3 w-3" />
                                {it.pctChange >= 0 ? "+" : ""}
                                {it.pctChange.toFixed(2)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </DataState>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Data World Bank merupakan tahunan dengan delay publikasi. Data global Yahoo Finance untuk
        keperluan informasi, bukan execution venue. Bukan rekomendasi investasi.
      </p>
    </div>
  );
}
