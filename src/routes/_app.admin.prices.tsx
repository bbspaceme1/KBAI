import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtNum } from "@/lib/format";
import { refreshEodPrices } from "@/lib/portfolio.functions";
import {
  refreshIntradayPrices,
  backfillEodFromApril,
  deleteAllMarketData,
  exportAllMarketData,
} from "@/lib/market-data.functions";
import { toast } from "sonner";
import { RefreshCw, Activity, Database, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/admin/prices")({
  component: AdminPricesPage,
});

function AdminPricesPage() {
  const qc = useQueryClient();
  const auth = useAuth();
  const accessToken = auth.session?.access_token;
  const [backfillFrom, setBackfillFrom] = useState(
    format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd", { locale: idLocale }),
  );
  const [backfillTo, setBackfillTo] = useState(
    format(new Date(), "yyyy-MM-dd", { locale: idLocale }),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eodQ = useQuery({
    queryKey: ["admin-eod-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eod_prices")
        .select("*")
        .order("date", { ascending: false })
        .order("ticker", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const benchQ = useQuery({
    queryKey: ["admin-bench-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmark_prices")
        .select("*")
        .order("date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const refreshMut = useMutation({
    mutationFn: () => refreshEodPrices(accessToken ? { access_token: accessToken } : undefined),
    onSuccess: (res) => {
      toast.success(`${res.updated} harga diperbarui dari penyedia data pasar`);
      qc.invalidateQueries({ queryKey: ["admin-eod-prices"] });
      qc.invalidateQueries({ queryKey: ["admin-bench-prices"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const intradayMut = useMutation({
    mutationFn: () =>
      refreshIntradayPrices(accessToken ? { access_token: accessToken } : undefined),
    onSuccess: (res) => {
      toast.success(`Intraday: ${res.updated} ticker + IHSG ${res.ihsg ? fmtNum(res.ihsg) : "—"}`);
      qc.invalidateQueries({ queryKey: ["admin-eod-prices"] });
      qc.invalidateQueries({ queryKey: ["admin-bench-prices"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const backfillMut = useMutation({
    mutationFn: () =>
      backfillEodFromApril({
        data: {
          from_date: backfillFrom,
          to_date: backfillTo,
          ...(accessToken ? { access_token: accessToken } : {}),
        },
      }),
    onSuccess: (res) => {
      toast.success(
        `Backfill OK: ${res.tickers_ok}/${res.total_tickers ?? "?"} ticker · ${res.total_eod_rows} bar · IHSG ${res.ihsg_days}d · GOLD ${res.gold_days}d · BTC ${res.btc_days}d`,
      );
      qc.invalidateQueries({ queryKey: ["admin-eod-prices"] });
      qc.invalidateQueries({ queryKey: ["admin-bench-prices"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteAllMarketData(accessToken ? { access_token: accessToken } : undefined),
    onSuccess: () => {
      toast.success("Semua data harga berhasil dihapus");
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ["admin-eod-prices"] });
      qc.invalidateQueries({ queryKey: ["admin-bench-prices"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: () => exportAllMarketData(accessToken ? { access_token: accessToken } : undefined),
    onSuccess: (res) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.eod), "EOD Prices");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res.benchmark), "Benchmarks");
      XLSX.writeFile(
        wb,
        `kbai-market-data-${format(new Date(), "yyyyMMdd-HHmm", { locale: idLocale })}.xlsx`,
      );
      toast.success(`Export OK: ${res.eod.length} EOD + ${res.benchmark.length} benchmark`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Data Engine</CardTitle>
          <CardDescription>
            Sumber: Penyedia data pasar terverifikasi dengan fallback ke Yahoo Finance saat
            diperlukan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => intradayMut.mutate()}
              disabled={intradayMut.isPending}
              variant="default"
            >
              <Activity className={intradayMut.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh Intraday (real-time)
            </Button>
            <Button
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
              variant="secondary"
            >
              <RefreshCw className={refreshMut.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh EOD + Snapshot KBAI
            </Button>
            <Button
              onClick={() => exportMut.mutate()}
              disabled={exportMut.isPending}
              variant="outline"
            >
              <Download className={exportMut.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {exportMut.isPending ? "Exporting..." : "Export Excel"}
            </Button>
            <Button
              onClick={() => (confirmDelete ? deleteMut.mutate() : setConfirmDelete(true))}
              disabled={deleteMut.isPending}
              variant="destructive"
            >
              <Trash2 className={deleteMut.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {deleteMut.isPending
                ? "Menghapus..."
                : confirmDelete
                  ? "Klik lagi untuk konfirmasi"
                  : "Delete All Data"}
            </Button>
          </div>

          <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Backfill from
              </Label>
              <Input
                type="date"
                value={backfillFrom}
                onChange={(e) => setBackfillFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Backfill to
              </Label>
              <Input
                type="date"
                value={backfillTo}
                onChange={(e) => setBackfillTo(e.target.value)}
              />
            </div>
            <Button
              onClick={() => backfillMut.mutate()}
              disabled={backfillMut.isPending || !backfillFrom || !backfillTo}
              variant="outline"
            >
              <Database className={backfillMut.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {backfillMut.isPending ? "Backfilling..." : "Backfill EOD"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ManualBenchmarkForm />

      <Card>
        <CardHeader>
          <CardTitle>EOD Prices Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Close</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(eodQ.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {format(new Date(p.date), "dd MMM yyyy", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-medium">{p.ticker}</TableCell>
                    <TableCell className="text-right">{fmtNum(Number(p.close))}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.source ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benchmark Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(benchQ.data ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {format(new Date(b.date), "dd MMM yyyy", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-medium">{b.symbol}</TableCell>
                    <TableCell className="text-right">{fmtNum(Number(b.value))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ManualBenchmarkForm() {
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState<"IHSG" | "GOLD" | "BTC" | "SMF">("SMF");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd", { locale: idLocale }));
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(value);
    if (!v || v <= 0) {
      toast.error("Value tidak valid");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("benchmark_prices")
        .upsert([{ symbol, date, value: v }], { onConflict: "symbol,date" });
      if (error) throw error;
      toast.success(`${symbol} @ ${date} = ${v}`);
      setValue("");
      qc.invalidateQueries({ queryKey: ["admin-bench-prices"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Manual Benchmark</CardTitle>
        <CardDescription>
          IHSG, GOLD, dan BTC diisi otomatis oleh refresh engine. Input manual untuk SMF
          (Sucorinvest Maxi Fund) — sumber NAB: cermati.com / bibit.id / pasardana.id.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Select
              value={symbol}
              onValueChange={(v) => setSymbol(v as "IHSG" | "GOLD" | "BTC" | "SMF")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMF">SMF (Sucorinvest Maxi Fund)</SelectItem>
                <SelectItem value="IHSG">IHSG</SelectItem>
                <SelectItem value="GOLD">Emas</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
