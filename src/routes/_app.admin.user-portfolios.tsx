import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtIDR } from "@/lib/format";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/user-portfolios")({
  component: UserPortfoliosPage,
});

type SortDir = "asc" | "desc";

function UserPortfoliosPage() {
  const profilesQ = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });
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
      const { data, error } = await supabase
        .from("cash_balances")
        .select("user_id, balance, updated_at");
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

  const rows = useMemo(() => {
    const profiles = profilesQ.data ?? [];
    const cashByUser = new Map((cashQ.data ?? []).map((c) => [c.user_id, Number(c.balance)]));
    const holdsByUser = new Map<string, { value: number; cost: number; positions: number }>();
    for (const h of holdingsQ.data ?? []) {
      const last = pricesQ.data?.get(h.ticker) ?? Number(h.avg_price);
      const value = last * h.total_lot * 100;
      const cost = Number(h.avg_price) * h.total_lot * 100;
      const cur = holdsByUser.get(h.user_id) ?? { value: 0, cost: 0, positions: 0 };
      cur.value += value;
      cur.cost += cost;
      cur.positions += 1;
      holdsByUser.set(h.user_id, cur);
    }
    return profiles.map((p) => {
      const h = holdsByUser.get(p.id) ?? { value: 0, cost: 0, positions: 0 };
      const cash = cashByUser.get(p.id) ?? 0;
      const equity = h.value + cash;
      const pl = h.value - h.cost;
      return {
        user_id: p.id,
        username: p.username,
        display_name: p.display_name,
        cash,
        market_value: h.value,
        cost_basis: h.cost,
        positions: h.positions,
        equity,
        pl,
      };
    });
  }, [profilesQ.data, cashQ.data, holdingsQ.data, pricesQ.data]);

  const [sortKey, setSortKey] = useState<string>("equity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
    <Card className="rounded-sm border-border">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
          User Portfolios ({sorted.length})
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
                  label="Cash"
                  k="cash"
                  cur={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Market Value"
                  k="market_value"
                  cur={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Cost"
                  k="cost_basis"
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
                  label="Equity"
                  k="equity"
                  cur={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Positions"
                  k="positions"
                  cur={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody className="text-[13px] tabular">
              {sorted.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-mono text-[12px] font-semibold">
                    {u.username}
                  </TableCell>
                  <TableCell className="text-right">{fmtIDR(u.cash)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(u.market_value)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmtIDR(u.cost_basis)}
                  </TableCell>
                  <TableCell
                    className={cn("text-right font-medium", u.pl >= 0 ? "text-pos" : "text-neg")}
                  >
                    {fmtIDR(u.pl)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtIDR(u.equity)}</TableCell>
                  <TableCell className="text-right">{u.positions}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Belum ada user.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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
