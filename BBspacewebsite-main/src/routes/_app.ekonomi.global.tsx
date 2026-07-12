import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getGlobalQuotes, getCommodityQuotes } from "@/lib/ekonomi.functions";
import { DataState } from "@/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ekonomi/global")({
  component: GlobalPage,
});

function GlobalPage() {
  const fetchGlobal = getGlobalQuotes;
  const fetchComm = getCommodityQuotes;

  const globalQ = useQuery({
    queryKey: ["ekonomi-global"],
    queryFn: () => fetchGlobal(),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
  const commQ = useQuery({
    queryKey: ["ekonomi-comm"],
    queryFn: () => fetchComm(),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Indeks & FX Global
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataState
            isLoading={globalQ.isLoading}
            isError={globalQ.isError}
            error={globalQ.error}
            data={globalQ.data}
            onRetry={() => globalQ.refetch()}
            isEmpty={(d) => d.items.every((i) => i.price == null)}
          >
            {(d) => <QuoteTable items={d.items} />}
          </DataState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Komoditas Global
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataState
            isLoading={commQ.isLoading}
            isError={commQ.isError}
            error={commQ.error}
            data={commQ.data}
            onRetry={() => commQ.refetch()}
            isEmpty={(d) => d.items.every((i) => i.price == null)}
          >
            {(d) => <QuoteTable items={d.items} />}
          </DataState>
        </CardContent>
      </Card>
    </div>
  );
}

type Item = {
  symbol: string;
  name: string;
  price: number | null;
  pctChange: number | null;
};

function QuoteTable({ items }: { items: Item[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
          <th className="px-3 py-2 text-left">Instrumen</th>
          <th className="px-3 py-2 text-right">Harga</th>
          <th className="px-3 py-2 text-right">%</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {items.map((i) => (
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
  );
}
