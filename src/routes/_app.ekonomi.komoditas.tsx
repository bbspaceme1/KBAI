import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCommodityQuotes } from "@/lib/ekonomi.functions";
import { DataState } from "@/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ekonomi/komoditas")({
  component: KomoditasPage,
});

function KomoditasPage() {
  const fetchComm = getCommodityQuotes;
  const q = useQuery({
    queryKey: ["ekonomi-comm-only"],
    queryFn: () => fetchComm(),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Komoditas Global · Yahoo Finance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <DataState
          isLoading={q.isLoading}
          isError={q.isError}
          error={q.error}
          data={q.data}
          onRetry={() => q.refetch()}
          isEmpty={(d) => d.items.every((i) => i.price == null)}
        >
          {(d) => (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left">Komoditas</th>
                  <th className="px-3 py-2 text-right">Harga</th>
                  <th className="px-3 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.items.map((i) => (
                  <tr key={i.symbol} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium">{i.name}</div>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground">
                        {i.symbol}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {i.price != null ? fmtNum(i.price, 2) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-mono",
                        i.pctChange == null
                          ? "text-muted-foreground"
                          : i.pctChange >= 0
                            ? "text-pos"
                            : "text-neg",
                      )}
                    >
                      {i.pctChange != null
                        ? `${i.pctChange >= 0 ? "+" : ""}${i.pctChange.toFixed(2)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataState>
      </CardContent>
    </Card>
  );
}
