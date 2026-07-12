import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PortfolioChartProps {
  holdings: Array<{
    id: string;
    ticker: string;
    total_lot: number;
    avg_price: number;
  }>;
  prices: Map<string, { close: number; date: string }>;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function PortfolioChart({ holdings, prices, onRefresh, isRefreshing }: PortfolioChartProps) {
  const auth = useAuth();

  // Calculate portfolio composition for chart
  const chartData = holdings
    .map((h) => {
      const price = prices.get(h.ticker);
      if (!price) return null;

      const value = h.total_lot * price.close * 100;
      const cost = h.total_lot * Number(h.avg_price) * 100;
      const pl = value - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;

      return {
        ticker: h.ticker,
        value,
        cost,
        pl,
        plPct,
        weight: 0, // Will be calculated after
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.value - a.value);

  const totalValue = chartData.reduce((sum, item) => sum + (item?.value || 0), 0);
  chartData.forEach((item) => {
    if (item) {
      item.weight = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    }
  });

  return (
    <section className="rounded-sm border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
          Portfolio Composition
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 rounded-sm text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={isRefreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </header>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-accent/50">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold">No chart data</h3>
            <p className="max-w-sm text-[12px] text-muted-foreground">
              Add holdings and refresh prices to see your portfolio composition.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5">
          {/* Simple bar chart representation */}
          <div className="space-y-3">
            {chartData.slice(0, 8).map((item) => (
              <div key={item.ticker} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-mono font-semibold">{item.ticker}</span>
                  <span className="text-muted-foreground">
                    {item.weight.toFixed(1)}% · ${(item.value / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className="relative h-2 bg-border/50 rounded-sm overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-foreground transition-all duration-300"
                    style={{ width: `${item.weight}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {chartData.length > 8 && (
            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              Showing top 8 positions ({chartData.length - 8} more not shown)
            </p>
          )}
        </div>
      )}
    </section>
  );
}
