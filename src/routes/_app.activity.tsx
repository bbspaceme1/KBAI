import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_app/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const auth = useAuth();
  const userId = auth.user?.id;

  const q = useQuery({
    queryKey: ["my-audit", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, metadata, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Personal
        </div>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Activity Log
        </h2>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
          Riwayat aktivitas akun Anda — login, transaksi, perubahan watchlist, dan setting.
        </p>
      </div>

      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <ScrollText className="h-4 w-4" /> {q.data?.length ?? 0} entri terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Waktu</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Memuat…
                    </TableCell>
                  </TableRow>
                )}
                {!q.isLoading && (q.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Belum ada aktivitas tercatat.
                    </TableCell>
                  </TableRow>
                )}
                {(q.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {r.entity ?? "—"}
                      {r.entity_id && (
                        <span className="text-muted-foreground"> · {r.entity_id.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[420px] truncate font-mono text-[10px] text-muted-foreground">
                      {r.metadata &&
                      typeof r.metadata === "object" &&
                      Object.keys(r.metadata as object).length > 0
                        ? JSON.stringify(r.metadata)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
