import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { adminListSessions, adminRevokeSession } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, LogOut } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/security")({
  component: AdminSecurityPage,
});

function parseUA(ua?: string | null): string {
  if (!ua) return "Unknown device";
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Edg|Opera)\/[\d.]+/);
  const browser = m?.[1]?.replace("Edg", "Edge") ?? "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} · ${os}`;
}

function AdminSecurityPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);

  const q = useQuery({
    queryKey: ["admin-sessions", activeOnly],
    enabled: !!auth.user?.id,
    queryFn: () => adminListSessions({ only_active: activeOnly, limit: 300 }),
  });

  const revokeMut = useMutation({
    mutationFn: (session_id: string) => adminRevokeSession({ session_id }),
    onSuccess: () => {
      toast.success("Session ditandai revoked");
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const rows = q.data ?? [];
  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="rounded-sm border-border">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Sesi aktif
            </div>
            <div className="font-mono text-2xl font-semibold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-border">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Total tracked
            </div>
            <div className="font-mono text-2xl font-semibold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-border">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Status
            </div>
            <div className="text-[12px] mt-1 text-pos">Live tracking aktif</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <ShieldCheck className="h-4 w-4" /> Device & Session Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
            <Label htmlFor="active-only" className="text-[11px]">
              Hanya aktif
            </Label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Memuat...
                    </TableCell>
                  </TableRow>
                )}
                {!q.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Belum ada sesi tercatat
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[12px] font-medium">
                      {r.username ?? r.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {r.device_label ?? parseUA(r.user_agent)}
                    </TableCell>
                    <TableCell>
                      {r.is_active ? (
                        <Badge className="bg-pos text-background hover:bg-pos">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Ended</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM HH:mm", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {format(new Date(r.last_seen_at), "dd MMM HH:mm", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.is_active && (
                        <Button size="sm" variant="outline" onClick={() => revokeMut.mutate(r.id)}>
                          <LogOut className="h-3 w-3" /> Revoke
                        </Button>
                      )}
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
