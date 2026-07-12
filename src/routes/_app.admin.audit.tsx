import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { adminListAuditLogs } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, Search, FileDown } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { exportRowsCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/_app/admin/audit")({
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const auth = useAuth();
  const [filter, setFilter] = useState("");

  const q = useQuery({
    queryKey: ["admin-audit-logs"],
    enabled: !!auth.user?.id,
    queryFn: () => adminListAuditLogs({ limit: 300 }),
  });

  const rows = (q.data ?? []).filter((r) => {
    if (!filter.trim()) return true;
    const s = filter.toLowerCase();
    return (
      r.action.toLowerCase().includes(s) ||
      (r.username ?? "").toLowerCase().includes(s) ||
      (r.entity ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <ScrollText className="h-4 w-4" /> Audit Log · {rows.length} entri
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Cari action / user / entity"
                className="h-8 pl-7 text-[12px]"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-sm text-[11px] uppercase tracking-[0.12em]"
              onClick={() =>
                exportRowsCsv(
                  `audit-${format(new Date(), "yyyyMMdd-HHmm", { locale: idLocale })}`,
                  rows.map((r) => ({
                    timestamp: r.created_at,
                    user: r.username ?? "",
                    action: r.action,
                    entity: r.entity ?? "",
                    entity_id: r.entity_id ?? "",
                    metadata: r.metadata ? JSON.stringify(r.metadata) : "",
                  })),
                )
              }
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Waktu</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Memuat...
                    </TableCell>
                  </TableRow>
                )}
                {!q.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Belum ada aktivitas tercatat
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM HH:mm:ss", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {r.username ?? <span className="text-muted-foreground">—</span>}
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
                    <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[400px] truncate">
                      {r.metadata && Object.keys(r.metadata).length > 0
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
