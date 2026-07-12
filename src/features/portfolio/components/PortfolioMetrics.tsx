import { fmtIDR, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MetricTooltip } from "@/components/metric-tooltip";

interface PortfolioMetricsProps {
  totalEquity: number;
  totalValue: number;
  cashBalance: number;
  totalPL: number;
  totalPLPct: number;
}

export function PortfolioMetrics({
  totalEquity,
  totalValue,
  cashBalance,
  totalPL,
  totalPLPct,
}: PortfolioMetricsProps) {
  return (
    <section className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Total Equity"
        value={fmtIDR(totalEquity)}
        sub="Holdings + Cash"
        tooltip="Nilai pasar holdings + saldo cash. Snapshot per harga EOD terakhir."
      />
      <Stat
        label="Market Value"
        value={fmtIDR(totalValue)}
        sub={`${0} positions`} // TODO: pass actual count
        tooltip="Lot × harga EOD × 100 saham per lot."
      />
      <Stat
        label="Cash Balance"
        value={fmtIDR(cashBalance)}
        sub="Idle funds"
        tooltip="Saldo cash yang belum diinvestasikan, otomatis berkurang saat BUY dan bertambah saat SELL."
      />
      <Stat
        label="Unrealized P/L"
        value={fmtIDR(totalPL)}
        sub={fmtPct(totalPLPct)}
        tone={totalPL >= 0 ? "pos" : "neg"}
        tooltip="Selisih nilai pasar terhadap cost basis (avg price × lot × 100). Belum direalisasikan sampai SELL."
      />
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg";
  tooltip?: string;
}) {
  return (
    <div className="bg-card px-5 py-5">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        {tooltip && <MetricTooltip term={label} description={tooltip} />}
      </div>
      <div
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular tracking-tight",
          tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "mt-1 text-[11px] tabular",
            tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-muted-foreground",
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
