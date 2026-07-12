import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { ModuleHeader } from "@/components/analisis-shared";
import {
  fetchIDXScreener,
  IDX_BOARDS,
  IDX_SECTORS,
  formatIDR,
  formatMarketCap,
  formatPercent,
  getChangeColor,
} from "@/lib/idx-data";

export const Route = createFileRoute("/_app/idx/screener")({
  component: IDXScreenPage,
});

function IDXScreenPage() {
  const [sector, setSector] = useState<string>("");
  const [board, setBoard] = useState<string>("");
  const [minPer, setMinPer] = useState<string>("");
  const [maxPer, setMaxPer] = useState<string>("");
  const [minRoe, setMinRoe] = useState<string>("");
  const [minDivYield, setMinDivYield] = useState<string>("");
  const [maxDer, setMaxDer] = useState<string>("");

  const filters = useMemo(
    () => ({
      sector: sector || undefined,
      board: board || undefined,
      min_per: minPer ? parseFloat(minPer) : undefined,
      max_per: maxPer ? parseFloat(maxPer) : undefined,
      min_roe: minRoe ? parseFloat(minRoe) : undefined,
      min_div_yield: minDivYield ? parseFloat(minDivYield) : undefined,
      max_der: maxDer ? parseFloat(maxDer) : undefined,
      sort_by: "market_cap",
      sort_order: "desc" as const,
      limit: 100,
    }),
    [sector, board, minPer, maxPer, minRoe, minDivYield, maxDer],
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["idx-screener", filters],
    queryFn: () => fetchIDXScreener(filters),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        role="IDX Market Analyst"
        title="IDX Screener"
        description="Temukan saham IDX berdasarkan rasio fundamental, sektor, dan valuasi gratis di BB Space."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Filter Screener
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Sector</Label>
              <Select value={sector} onValueChange={(value) => setSector(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua sektor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua sektor</SelectItem>
                  {IDX_SECTORS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Board</Label>
              <Select value={board} onValueChange={(value) => setBoard(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua board</SelectItem>
                  {IDX_BOARDS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min P/E</Label>
                <Input
                  type="number"
                  value={minPer}
                  onChange={(e) => setMinPer(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max P/E</Label>
                <Input
                  type="number"
                  value={maxPer}
                  onChange={(e) => setMaxPer(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min ROE</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={minRoe}
                  onChange={(e) => setMinRoe(e.target.value)}
                  placeholder="0.10"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Dividend Yield</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={minDivYield}
                  onChange={(e) => setMinDivYield(e.target.value)}
                  placeholder="0.03"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Debt/Eq</Label>
              <Input
                type="number"
                step="0.01"
                value={maxDer}
                onChange={(e) => setMaxDer(e.target.value)}
                placeholder="2.0"
              />
            </div>

            <Button className="w-full" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Jalankan Screener
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Hasil Screener
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : data?.data && data.data.length > 0 ? (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>P/E</TableHead>
                    <TableHead>PBV</TableHead>
                    <TableHead>ROE</TableHead>
                    <TableHead>Div Yield</TableHead>
                    <TableHead>Market Cap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((stock) => (
                    <TableRow key={stock.ticker}>
                      <TableCell className="font-mono font-semibold">{stock.ticker}</TableCell>
                      <TableCell>{stock.name}</TableCell>
                      <TableCell>{formatIDR(stock.price)}</TableCell>
                      <TableCell>{stock.per?.toFixed(1) ?? "-"}</TableCell>
                      <TableCell>{stock.pbv?.toFixed(2) ?? "-"}</TableCell>
                      <TableCell>{stock.roe ? `${(stock.roe * 100).toFixed(1)}%` : "-"}</TableCell>
                      <TableCell>
                        {stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(2)}%` : "-"}
                      </TableCell>
                      <TableCell>{formatMarketCap(stock.marketCap ?? null)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Sesuaikan filter di kiri dan klik <strong>Jalankan Screener</strong> untuk melihat
                saham IDX.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
