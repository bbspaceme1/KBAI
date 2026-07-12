import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react";
import { ModuleHeader } from "@/components/analisis-shared";
import { fetchIDXMarketOverview, formatIDR, formatPercent, getChangeColor } from "@/lib/idx-data";

export const Route = createFileRoute("/_app/idx/markets")({
  component: IDXMarketsPage,
});

function IDXMarketsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["idx-market-overview"],
    queryFn: fetchIDXMarketOverview,
    staleTime: 1000 * 60 * 5,
  });

  const sectorSummary = useMemo(() => data?.sectors ?? [], [data]);
  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];
  const indices = data?.indices ?? [];

  return (
    <div className="space-y-6">
      <ModuleHeader
        role="IDX Market Monitor"
        title="IDX Market Overview"
        description="Pantau IHSG, LQ45, IDX momentum, dan sektor terkuat secara real-time dari BB Space."
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : error || !data ? (
        <Card>
          <CardContent className="text-center text-sm text-destructive">
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin" />
            Gagal memuat data IDX. Coba refresh halaman atau periksa koneksi API.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {indices.map((index) => (
              <Card key={index.index_code}>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
                    {index.index_code}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-semibold">{formatIDR(index.close)}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatPercent(index.change_pct)}</span>
                    <Badge variant={index.change_pct >= 0 ? "default" : "destructive"}>
                      {index.date}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-right">Close</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gainers.map((stock) => (
                      <TableRow key={stock.ticker}>
                        <TableCell>{stock.ticker}</TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell className="text-right">{formatIDR(stock.price)}</TableCell>
                        <TableCell className={`text-right ${getChangeColor(stock.changePercent)}`}>
                          {formatPercent(stock.changePercent)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-right">Close</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {losers.map((stock) => (
                      <TableRow key={stock.ticker}>
                        <TableCell>{stock.ticker}</TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell className="text-right">{formatIDR(stock.price)}</TableCell>
                        <TableCell className={`text-right ${getChangeColor(stock.changePercent)}`}>
                          {formatPercent(stock.changePercent)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
                Sector Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectorSummary.map((sector) => (
                  <div key={sector.sector} className="rounded-xl border border-border p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {sector.sector}
                    </div>
                    <div className="mt-3 text-2xl font-semibold">{formatIDR(sector.marketCap)}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      ROE: {formatPercent(sector.avgRoe)} · P/E: {sector.avgPer.toFixed(1)} ·
                      Change: {formatPercent(sector.avgChange)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
