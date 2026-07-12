import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_app/market-insight")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: MarketInsightPage,
});

function MarketInsightPage() {
  const latestQ = useQuery({
    queryKey: ["latest-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <Megaphone className="h-4 w-4" /> Market Insight Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {latestQ.isLoading ? (
            <p className="text-[13px] text-muted-foreground">Memuat...</p>
          ) : !latestQ.data ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              Belum ada market insight dari advisor. Silakan cek lagi nanti.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Broadcast:{" "}
                  {format(new Date(latestQ.data.created_at), "EEEE, dd MMMM yyyy", {
                    locale: idLocale,
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  oleh{" "}
                  <span className="font-mono font-semibold text-foreground">
                    @{latestQ.data.posted_by_username}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">{latestQ.data.title}</h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                {latestQ.data.body}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
