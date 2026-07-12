import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtIDR, fmtNum } from "@/lib/format";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { exportRowsCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/_app/admin/transactions")({
  component: AdminTransactionsPage,
});

type SortDir = "asc" | "desc";

function AdminTransactionsPage() {
  const profilesQ = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username");
      if (error) throw error;
      return data ?? [];
    },
  });
  const userMap = useMemo(
    () => new Map((profilesQ.data ?? []).map((p) => [p.id, p.username])),
    [profilesQ.data],
  );

  const txnsQ = useQuery({
    queryKey: ["admin-all-transactions-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transacted_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [userFilter, setUserFilter] = useState<string>("all");
  const [tickerFilter, setTickerFilter] = useState("");
  const [sideFilter, setSideFilter] = useState<"all" | "BUY" | "SELL">("all");
  const [sortKey, setSortKey] = useState<string>("transacted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    return (txnsQ.data ?? [])
      .filter((t) => {
        if (userFilter !== "all" && t.user_id !== userFilter) return false;
        if (sideFilter !== "all" && t.side !== sideFilter) return false;
        if (tickerFilter && !t.ticker.includes(tickerFilter.toUpperCase())) return false;
        return true;
      })
      .map((t) => ({
        ...t,
        notional: Number(t.price) * t.lot * 100,
        username: userMap.get(t.user_id) ?? t.user_id.slice(0, 8),
      }));
  }, [txnsQ.data, userFilter, sideFilter, tickerFilter, userMap]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              User
            </label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-9 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {(profilesQ.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Ticker
            </label>
            <Input
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
              placeholder="e.g. BBCA"
              className="h-9 rounded-sm font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Side
            </label>
            <Select
              value={sideFilter}
              onValueChange={(v) => setSideFilter(v as "all" | "BUY" | "SELL")}
            >
              <SelectTrigger className="h-9 rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sides</SelectItem>
                <SelectItem value="BUY">BUY only</SelectItem>
                <SelectItem value="SELL">SELL only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            Transactions ({sorted.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-sm text-[11px] uppercase tracking-[0.12em]"
            onClick={() =>
              exportRowsCsv(
                `transactions-${format(new Date(), "yyyyMMdd-HHmm", { locale: idLocale })}`,
                sorted.map((t) => ({
                  date: format(new Date(t.transacted_at), "yyyy-MM-dd", { locale: idLocale }),
                  user: t.username,
                  ticker: t.ticker,
                  side: t.side,
                  lot: t.lot,
                  price: t.price,
                  notional: t.notional,
                })),
                ["date", "user", "ticker", "side", "lot", "price", "notional"],
              )
            }
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Date"
                    k="transacted_at"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableHead
                    label="User"
                    k="username"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableHead
                    label="Ticker"
                    k="ticker"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableHead
                    label="Side"
                    k="side"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                  />
                  <SortableHead
                    label="Lot"
                    k="lot"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Price"
                    k="price"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Notional"
                    k="notional"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px] tabular">
                {sorted.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {format(new Date(t.transacted_at), "dd MMM yyyy", { locale: idLocale })}
                    </TableCell>
                    <TableCell>{t.username}</TableCell>
                    <TableCell className="font-mono text-[12px] font-semibold">
                      {t.ticker}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={t.side === "BUY" ? "default" : "secondary"}
                        className={cn(
                          t.side === "BUY"
                            ? "bg-pos/15 text-pos border-pos/30"
                            : "bg-neg/15 text-neg border-neg/30",
                        )}
                      >
                        {t.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.lot}</TableCell>
                    <TableCell className="text-right">{fmtNum(Number(t.price))}</TableCell>
                    <TableCell className="text-right">{fmtIDR(t.notional)}</TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Tidak ada transaksi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableHead({
  label,
  k,
  cur,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  k: string;
  cur: string;
  dir: SortDir;
  onClick: (k: string) => void;
  align?: "left" | "right";
}) {
  const active = cur === k;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}
