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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtIDR, fmtNum } from "@/lib/format";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/holdings")({
  component: AdminHoldingsPage,
});

type SortDir = "asc" | "desc";

function AdminHoldingsPage() {
  const profilesQ = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const userMap = useMemo(
    () => new Map((profilesQ.data ?? []).map((p) => [p.id, p.username])),
    [profilesQ.data],
  );

  const holdingsQ = useQuery({
    queryKey: ["admin-all-holdings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("holdings").select("*").gt("total_lot", 0);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cashQ = useQuery({
    queryKey: ["admin-all-cash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_balances").select("user_id, balance");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pricesQ = useQuery({
    queryKey: ["admin-all-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eod_prices")
        .select("ticker, close, date")
        .order("date", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const p of data ?? []) {
        if (!map.has(p.ticker)) map.set(p.ticker, Number(p.close));
      }
      return map;
    },
  });

  const [userFilter, setUserFilter] = useState<string>("all");
  const [tickerFilter, setTickerFilter] = useState("");
  const [sortKey, setSortKey] = useState<string>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Compute per-user equity (holdings value + cash) for "% pool" basis
  const userEquityMap = useMemo(() => {
    const cashByUser = new Map((cashQ.data ?? []).map((c) => [c.user_id, Number(c.balance)]));
    const holdValueByUser = new Map<string, number>();
    for (const h of holdingsQ.data ?? []) {
      const last = pricesQ.data?.get(h.ticker) ?? Number(h.avg_price);
      const value = last * h.total_lot * 100;
      holdValueByUser.set(h.user_id, (holdValueByUser.get(h.user_id) ?? 0) + value);
    }
    const out = new Map<string, number>();
    const ids = new Set([...cashByUser.keys(), ...holdValueByUser.keys()]);
    for (const uid of ids) {
      out.set(uid, (holdValueByUser.get(uid) ?? 0) + (cashByUser.get(uid) ?? 0));
    }
    return out;
  }, [cashQ.data, holdingsQ.data, pricesQ.data]);

  const holdingsRows = useMemo(() => {
    const filt = (holdingsQ.data ?? []).filter((h) => {
      if (userFilter !== "all" && h.user_id !== userFilter) return false;
      if (tickerFilter && !h.ticker.includes(tickerFilter.toUpperCase())) return false;
      return true;
    });
    return filt.map((h) => {
      const last = pricesQ.data?.get(h.ticker) ?? Number(h.avg_price);
      const value = last * h.total_lot * 100;
      const cost = Number(h.avg_price) * h.total_lot * 100;
      const userEquity = userEquityMap.get(h.user_id) ?? 0;
      return {
        ...h,
        last,
        value,
        cost,
        pl: value - cost,
        // % pool refers to this user's TOTAL EQUITY, not the community total
        pct_pool: userEquity > 0 ? (value / userEquity) * 100 : 0,
        username: userMap.get(h.user_id) ?? h.user_id.slice(0, 8),
      };
    });
  }, [holdingsQ.data, userFilter, tickerFilter, pricesQ.data, userMap, userEquityMap]);

  const sorted = useMemo(() => {
    const arr = [...holdingsRows];
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
  }, [holdingsRows, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
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
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
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
              Ticker contains
            </label>
            <Input
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
              placeholder="e.g. BBCA"
              className="h-9 rounded-sm font-mono text-[13px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            All Holdings ({sorted.length}) — % Pool relative to each user's equity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                    label="Lot"
                    k="total_lot"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Avg Price"
                    k="avg_price"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Last"
                    k="last"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="Value"
                    k="value"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="P/L"
                    k="pl"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <SortableHead
                    label="% Pool"
                    k="pct_pool"
                    cur={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="right"
                  />
                  <TableHead className="w-32 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Allocation
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px] tabular">
                {sorted.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.username}</TableCell>
                    <TableCell className="font-mono text-[12px] font-semibold">
                      {h.ticker}
                    </TableCell>
                    <TableCell className="text-right">{h.total_lot}</TableCell>
                    <TableCell className="text-right">{fmtNum(Number(h.avg_price))}</TableCell>
                    <TableCell className="text-right">{fmtNum(h.last)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(h.value)}</TableCell>
                    <TableCell className={cn("text-right", h.pl >= 0 ? "text-pos" : "text-neg")}>
                      {fmtIDR(h.pl)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular text-foreground/90">
                      {h.pct_pool.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <div className="h-1 w-full overflow-hidden rounded-sm bg-muted">
                        <div
                          className="h-full bg-foreground/70"
                          style={{ width: `${Math.min(100, h.pct_pool)}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      Tidak ada holdings yang sesuai filter.
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
