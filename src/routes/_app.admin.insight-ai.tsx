import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAiInsight } from "@/lib/insight-ai.functions";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_app/admin/insight-ai")({
  component: InsightAiPage,
});

function InsightAiPage() {
  const auth = useAuth();
  const [result, setResult] = useState<{
    content: string;
    generated_at: string;
    users_analyzed: number;
  } | null>(null);

  const refreshMut = useMutation({
    mutationFn: async () => {
      return generateAiInsight();
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Insight diperbarui (${data.users_analyzed} user dianalisis)`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal generate insight"),
  });

  return (
    <div className="space-y-6">
      <Card className="rounded-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <Sparkles className="h-4 w-4" /> Insight AI
          </CardTitle>
          <Button onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending} size="sm">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshMut.isPending ? "animate-spin" : ""}`} />
            {refreshMut.isPending ? "Menganalisis..." : "Refresh Insight"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 p-6">
          {!result && !refreshMut.isPending && (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              Klik <strong>Refresh Insight</strong> untuk menganalisis seluruh data komunitas dengan
              AI.
              <br />
              <span className="text-[11px]">
                AI akan membaca holdings, cash balance, dan harga terkini dari semua user.
              </span>
            </p>
          )}
          {refreshMut.isPending && (
            <p className="py-12 text-center text-[13px] text-muted-foreground">
              <Sparkles className="mx-auto mb-3 h-6 w-6 animate-pulse" />
              AI sedang menganalisis data internal komunitas...
            </p>
          )}
          {result && (
            <>
              <div className="border-b border-border pb-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Generated:{" "}
                {format(new Date(result.generated_at), "EEE, dd MMM yyyy HH:mm", {
                  locale: idLocale,
                })}{" "}
                · {result.users_analyzed} user dianalisis
              </div>
              <article className="prose prose-sm prose-invert max-w-none pt-4">
                <ReactMarkdown>{result.content}</ReactMarkdown>
              </article>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
