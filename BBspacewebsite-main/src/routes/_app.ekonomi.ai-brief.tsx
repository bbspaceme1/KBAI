import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { generateMacroBrief, getGlobalQuotes, getMacroSnapshot } from "@/lib/ekonomi.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/ekonomi/ai-brief")({
  component: AiBriefPage,
});

function AiBriefPage() {
  const fetchMacro = getMacroSnapshot;
  const fetchGlobal = getGlobalQuotes;
  const generate = generateMacroBrief;

  const macroQ = useQuery({
    queryKey: ["ekonomi-macro", "IDN"],
    queryFn: () => fetchMacro({ country: "IDN" }),
    staleTime: 1000 * 60 * 60,
  });
  const globalQ = useQuery({
    queryKey: ["ekonomi-global"],
    queryFn: () => fetchGlobal(),
    staleTime: 1000 * 60 * 5,
  });

  const briefMut = useMutation({
    mutationFn: () => {
      const macro = macroQ.data;
      const global = globalQ.data;
      const last = <T extends { value: number; year: number }>(arr?: T[]) =>
        arr && arr.length ? arr[arr.length - 1] : null;
      const summary = JSON.stringify({
        indonesia: macro
          ? {
              gdp_growth: last(macro.gdpGrowth),
              cpi: last(macro.cpi),
              unemployment: last(macro.unemployment),
              current_account_pct_gdp: last(macro.currentAccountPctGdp),
              reserves_usd: last(macro.reservesUsd),
            }
          : null,
        global_markets: global?.items.map((i) => ({
          name: i.name,
          symbol: i.symbol,
          price: i.price,
          pct_change: i.pctChange,
        })),
        as_of: new Date().toISOString(),
      });
      return generate({ summary_data: summary });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = !macroQ.isLoading && !globalQ.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4" />
            Daily Macro Brief (AI)
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Briefing harian berbasis World Bank + global markets, dirangkum oleh Lovable AI.
          </p>
        </div>
        <Button size="sm" disabled={!ready || briefMut.isPending} onClick={() => briefMut.mutate()}>
          {briefMut.isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-3.5 w-3.5" />
          )}
          Generate Brief
        </Button>
      </CardHeader>
      <CardContent>
        {briefMut.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : briefMut.data ? (
          <article className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {briefMut.data.brief}
          </article>
        ) : (
          <div className="rounded-sm border border-dashed border-border bg-card/30 px-6 py-12 text-center">
            <p className="text-sm font-medium">Belum ada briefing dihasilkan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Klik <strong>Generate Brief</strong> untuk merangkum kondisi makro hari ini.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
