import { fmtIDR, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Briefcase, Plus, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Holding {
  id: string;
  ticker: string;
  total_lot: number;
  avg_price: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
  prices: Map<string, { close: number; date: string }>;
  cashBalance: number;
  onBuyClick: () => void;
  onSellClick: () => void;
  onSetCashClick: () => void;
}

export function HoldingsTable({
  holdings,
  prices,
  cashBalance,
  onBuyClick,
  onSellClick,
  onSetCashClick,
}: HoldingsTableProps) {
  const rows = holdings
    .filter((h) => h.total_lot > 0)
    .map((h) => {
      const last = prices.get(h.ticker)?.close;
      const cost = h.total_lot * Number(h.avg_price) * 100;
      const value = last ? h.total_lot * last * 100 : null;
      const pl = value != null ? value - cost : null;
      const plPct = pl != null && cost > 0 ? (pl / cost) * 100 : null;
      return {
        id: h.id,
        ticker: h.ticker,
        total_lot: h.total_lot,
        avg_price: Number(h.avg_price),
        last,
        cost,
        value,
        pl,
        plPct,
      };
    });

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  if (rows.length === 0) {
    return (
      <section className="rounded-sm border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em]">Holdings</h2>
          <span className="text-[11px] text-muted-foreground">
            1 lot = 100 shares · EOD pricing
          </span>
        </header>
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-accent/50">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold">Belum ada posisi</h3>
            <p className="max-w-sm text-[12px] text-muted-foreground">
              Mulai catat holding pertama Anda. Tambahkan saldo cash terlebih dahulu, lalu klik Buy
              untuk mencatat pembelian.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {cashBalance <= 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSetCashClick}
                className="h-8 rounded-sm text-[12px] uppercase tracking-[0.12em]"
              >
                <Wallet className="mr-1.5 h-3.5 w-3.5" /> Set Cash
              </Button>
            )}
            <Button
              size="sm"
              onClick={onBuyClick}
              className="h-8 rounded-sm bg-foreground text-[12px] uppercase tracking-[0.12em] text-background hover:bg-foreground/90"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Holding Pertama
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Tip: gunakan <span className="font-mono">⌘K</span>{" "}
            untuk navigasi cepat.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em]">Holdings</h2>
        <span className="text-[11px] text-muted-foreground">1 lot = 100 shares · EOD pricing</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Ticker</th>
              <th className="px-4 py-2.5 text-right font-medium">Lot</th>
              <th className="px-4 py-2.5 text-right font-medium">Avg Price</th>
              <th className="px-4 py-2.5 text-right font-medium">Last</th>
              <th className="px-4 py-2.5 text-right font-medium">Cost</th>
              <th className="px-4 py-2.5 text-right font-medium">Market Value</th>
              <th className="px-4 py-2.5 text-right font-medium">P/L</th>
              <th className="px-4 py-2.5 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody className="text-[13px] tabular">
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[12px] font-semibold tracking-wide">
                    {r.ticker}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">{r.total_lot}</td>
                <td className="px-4 py-2.5 text-right">{fmtNum(Number(r.avg_price))}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.last != null ? (
                    fmtNum(r.last)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtIDR(r.cost)}</td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {r.value != null ? (
                    fmtIDR(r.value)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-medium",
                    r.pl == null ? "text-muted-foreground" : r.pl >= 0 ? "text-pos" : "text-neg",
                  )}
                >
                  {r.pl != null ? fmtIDR(r.pl) : "—"}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right",
                    r.plPct == null
                      ? "text-muted-foreground"
                      : r.plPct >= 0
                        ? "text-pos"
                        : "text-neg",
                  )}
                >
                  {r.plPct != null ? fmtPct(r.plPct) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-accent/30 text-[12px] font-semibold uppercase tracking-[0.1em]">
              <td className="px-4 py-2.5">Total</td>
              <td colSpan={3}></td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtIDR(totalCost)}</td>
              <td className="px-4 py-2.5 text-right">{fmtIDR(totalValue)}</td>
              <td className={cn("px-4 py-2.5 text-right", totalPL >= 0 ? "text-pos" : "text-neg")}>
                {fmtIDR(totalPL)}
              </td>
              <td className={cn("px-4 py-2.5 text-right", totalPL >= 0 ? "text-pos" : "text-neg")}>
                {fmtPct(totalPLPct)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
