import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fmtIDR, fmtNum } from "@/lib/format";

interface TransactionHistoryProps {
  userId: string;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const txnsQ = useQuery({
    queryKey: ["transactions", userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("transacted_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="rounded-sm border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
          Transaction History
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Latest {(txnsQ.data ?? []).length} entries
        </span>
      </header>
      {(txnsQ.data ?? []).length === 0 ? (
        <p className="py-12 text-center text-[13px] text-muted-foreground">
          No transactions recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Side</th>
                <th className="px-4 py-2.5 text-left font-medium">Ticker</th>
                <th className="px-4 py-2.5 text-right font-medium">Lot</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Notional</th>
              </tr>
            </thead>
            <tbody className="text-[13px] tabular">
              {(txnsQ.data ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/60 last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {format(new Date(t.transacted_at), "dd MMM yyyy", { locale: idLocale })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                        t.side === "BUY" ? "border-pos/40 text-pos" : "border-neg/40 text-neg",
                      )}
                    >
                      {t.side}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] font-semibold tracking-wide">
                    {t.ticker}
                  </td>
                  <td className="px-4 py-2.5 text-right">{t.lot}</td>
                  <td className="px-4 py-2.5 text-right">{fmtNum(Number(t.price))}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {fmtIDR(Number(t.price) * t.lot * 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
