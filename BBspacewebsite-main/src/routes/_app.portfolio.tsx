import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";

type UserWithRoles = { app_metadata?: { roles?: Array<string | null> } } | null;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fmtIDR, fmtNum, fmtPct } from "@/lib/format";
import { adjustCash, refreshEodPrices, submitTransaction } from "@/lib/portfolio.functions";
import { toast } from "sonner";
import { RefreshCw, Plus, Minus, Wallet, Briefcase, Sparkles, FileDown } from "lucide-react";
import { exportPortfolioPdf } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";
import { IDX_EMITEN, IDX_TICKERS } from "@/lib/idx-tickers";
import { ErrorBoundary } from "@/components/error-boundary";

// New components
import { HoldingsTable } from "@/features/portfolio/components/HoldingsTable";
import { TransactionDialog } from "@/features/portfolio/components/TransactionDialog";
import { CashManagementDialog } from "@/features/portfolio/components/CashManagementDialog";
import { PortfolioMetrics } from "@/features/portfolio/components/PortfolioMetrics";
import { PortfolioChart } from "@/features/portfolio/components/PortfolioChart";
import { TransactionHistory } from "@/features/portfolio/components/TransactionHistory";

function getRolesFromUser(user: UserWithRoles) {
  const roles = user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles.map(String) : [];
}

export const Route = createFileRoute("/_app/portfolio")({
  beforeLoad: async () => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) return;

    // First check JWT claims (fast path)
    const jwtRoles = getRolesFromUser(userData.user);
    let isAdmin = jwtRoles.includes("admin");
    let isAdvisor = jwtRoles.includes("advisor");

    // Fallback to DB query if JWT claims don't have role info
    if (!isAdmin && !isAdvisor) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      isAdmin = !!roles?.some((r) => String(r.role) === "admin");
      isAdvisor = !!roles?.some((r) => String(r.role) === "advisor");
    }

    // Admins and advisors don't have portfolios — send to dashboard
    if (isAdmin || isAdvisor) {
      throw redirect({ to: "/community" });
    }
  },
  component: PortfolioPage,
});

function PortfolioPage() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const accessToken = auth.session?.access_token;
  const qc = useQueryClient();
  const [openDialog, setOpenDialog] = useState<null | "BUY" | "SELL">(null);
  const [cashOpen, setCashOpen] = useState(false);

  const cashQ = useQuery({
    queryKey: ["cash-balance", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_balances")
        .select("balance, updated_at")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? { balance: 0, updated_at: null };
    },
  });
  const cashBalance = Number(cashQ.data?.balance ?? 0);

  const holdingsQ = useQuery({
    queryKey: ["holdings", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase.from("holdings").select("*").eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  const tickers = (holdingsQ.data ?? []).map((h) => h.ticker);

  const pricesQ = useQuery({
    queryKey: ["latest-prices", tickers.sort().join(",")],
    enabled: tickers.length > 0,
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eod_prices")
        .select("ticker, close, date")
        .in("ticker", tickers)
        .order("date", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { close: number; date: string }>();
      for (const p of data) {
        if (!map.has(p.ticker)) map.set(p.ticker, { close: Number(p.close), date: p.date });
      }
      return map;
    },
  });

  const refreshMut = useMutation({
    mutationFn: () => refreshEodPrices(accessToken ? { access_token: accessToken } : undefined),
    onSuccess: (res) => {
      toast.success(`Harga diperbarui: ${res.updated} ticker`);
      qc.invalidateQueries({ queryKey: ["latest-prices"] });
      qc.invalidateQueries({ queryKey: ["holdings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = (holdingsQ.data ?? []).map((h) => {
    const priceInfo = pricesQ.data?.get(h.ticker);
    const last = priceInfo?.close;
    const lot = h.total_lot;
    const avg = Number(h.avg_price);
    const value = last != null ? lot * last * 100 : null;
    const cost = lot * avg * 100;
    const pl = value != null ? value - cost : null;
    const plPct = value != null && cost > 0 ? ((value - cost) / cost) * 100 : null;
    return { ...h, last, value, cost, pl, plPct };
  });

  const totalValue = rows.reduce((s, r) => s + (r.value ?? r.cost), 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const totalEquity = totalValue + cashBalance;

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setOpenDialog("BUY")}
              className="h-8 rounded-sm bg-foreground px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-background hover:bg-foreground/90"
            >
              <Plus className="h-3.5 w-3.5" /> Buy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenDialog("SELL")}
              className="h-8 rounded-sm border-border px-4 text-[12px] font-semibold uppercase tracking-[0.12em] hover:bg-accent"
            >
              <Minus className="h-3.5 w-3.5" /> Sell
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCashOpen(true)}
              className="h-8 rounded-sm border-border px-4 text-[12px] font-semibold uppercase tracking-[0.12em] hover:bg-accent"
            >
              <Wallet className="h-3.5 w-3.5" /> Cash
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (rows.length === 0) {
                  toast.error("Belum ada holding untuk diexport");
                  return;
                }
                exportPortfolioPdf({
                  username: auth.username ?? auth.user?.email ?? "user",
                  asOf: new Date(),
                  cash: cashBalance,
                  totalValue,
                  totalCost,
                  positions: rows.map((r) => ({
                    ticker: r.ticker,
                    lot: r.total_lot,
                    avg: Number(r.avg_price),
                    last: r.last ?? 0,
                    value: r.value ?? r.cost,
                    pl: r.pl ?? 0,
                    plPct: r.plPct ?? 0,
                  })),
                });
                toast.success("PDF snapshot diunduh");
              }}
              className="h-8 rounded-sm text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
            >
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
              className="h-8 rounded-sm text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw
                className={refreshMut.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              />
              Refresh prices
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <PortfolioMetrics
          totalEquity={totalEquity}
          totalValue={totalValue}
          cashBalance={cashBalance}
          totalPL={totalPL}
          totalPLPct={totalPLPct}
        />

        {/* Holdings table */}
        <HoldingsTable
          holdings={holdingsQ.data ?? []}
          prices={pricesQ.data ?? new Map()}
          cashBalance={cashBalance}
          onBuyClick={() => setOpenDialog("BUY")}
          onSellClick={() => setOpenDialog("SELL")}
          onSetCashClick={() => setCashOpen(true)}
        />

        {/* Portfolio Chart */}
        <PortfolioChart
          holdings={holdingsQ.data ?? []}
          prices={pricesQ.data ?? new Map()}
          onRefresh={() => refreshMut.mutate()}
          isRefreshing={refreshMut.isPending}
        />

        {/* Transaction History */}
        <TransactionHistory userId={userId!} />

        <TransactionDialog
          open={openDialog !== null}
          side={openDialog ?? "BUY"}
          onClose={() => setOpenDialog(null)}
          holdings={holdingsQ.data ?? []}
          userId={userId!}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["holdings"] });
            qc.invalidateQueries({ queryKey: ["transactions"] });
            qc.invalidateQueries({ queryKey: ["cash-balance"] });
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
