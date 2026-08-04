import { createFileRoute } from "@tanstack/react-router";
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
import { cn } from "@/lib/utils";

const statusTone = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const ciStatus = [
  { label: "Lint", ok: true },
  { label: "Type-check", ok: true },
  { label: "Test", ok: false },
];

const findings = [
  {
    date: "2026-08-03",
    category: "Security",
    description: "CSV export needs neutralization for spreadsheet formula cells.",
    status: "Open",
  },
  {
    date: "2026-08-02",
    category: "Deployment",
    description: "Vercel preview build used last successful snapshot after a rollback.",
    status: "Resolved",
  },
  {
    date: "2026-08-01",
    category: "TypeCheck",
    description: "Admin route signature mismatch in user update flow.",
    status: "Open",
  },
];

const rlsCoverage = [
  { table: "holdings", rls: true, policies: 3 },
  { table: "cash_balances", rls: true, policies: 2 },
  { table: "transactions", rls: true, policies: 4 },
  { table: "profiles", rls: false, policies: 0 },
];

const deploymentHistory = [
  { status: "Healthy", duration: "3m 41s", version: "v2026.08.04.1" },
  { status: "Warning", duration: "4m 05s", version: "v2026.08.03.9" },
  { status: "Healthy", duration: "2m 58s", version: "v2026.08.03.8" },
  { status: "Error", duration: "9m 12s", version: "v2026.08.02.7" },
  { status: "Healthy", duration: "3m 30s", version: "v2026.08.02.6" },
  { status: "Healthy", duration: "2m 54s", version: "v2026.08.01.5" },
  { status: "Warning", duration: "5m 19s", version: "v2026.08.01.4" },
  { status: "Healthy", duration: "3m 22s", version: "v2026.08.01.3" },
  { status: "Healthy", duration: "4m 02s", version: "v2026.08.01.2" },
  { status: "Healthy", duration: "3m 47s", version: "v2026.08.01.1" },
];

export const Route = createFileRoute("/_app/admin/system-health")({
  component: SystemHealthPage,
});

function SystemHealthPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="CI Status"
          summary={ciStatus.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span>{item.label}</span>
              <Badge className={cn(item.ok ? statusTone.healthy : statusTone.error)}>
                {item.ok ? "Pass" : "Fail"}
              </Badge>
            </div>
          ))}
          tone="healthy"
        />
        <MetricCard
          title="AI Usage Bulan Ini"
          summary={
            <div className="space-y-3">
              <div className="text-xl font-semibold">IDR 127.400</div>
              <div className="text-xs text-muted-foreground">420 requests</div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[72%] rounded-full bg-emerald-500" />
              </div>
            </div>
          }
          tone="healthy"
        />
        <MetricCard
          title="Deployment Terakhir"
          summary={
            <div className="space-y-2 text-xs">
              <Badge className={statusTone.healthy}>Healthy</Badge>
              <div>2026-08-04 09:12 UTC</div>
              <div className="font-mono">a7f3c91</div>
            </div>
          }
          tone="healthy"
        />
        <MetricCard
          title="Weekly Monitor"
          summary={
            <div className="space-y-2 text-xs">
              <div>Last check: 2026-08-04</div>
              <Badge className={statusTone.error}>2 findings</Badge>
            </div>
          }
          tone="warning"
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Log Temuan Mingguan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((row) => (
                  <TableRow key={`${row.date}-${row.description}`}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>
                      <Badge
                        className={row.status === "Open" ? statusTone.error : statusTone.healthy}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RLS Coverage</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Tabel</TableHead>
                  <TableHead>Ada RLS</TableHead>
                  <TableHead>Jumlah Policy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rlsCoverage.map((row) => (
                  <TableRow key={row.table}>
                    <TableCell>{row.table}</TableCell>
                    <TableCell>
                      <Badge className={row.rls ? statusTone.healthy : statusTone.error}>
                        {row.rls ? "Ya" : "Tidak"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.policies}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Deployment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deploymentHistory.map((item, idx) => (
              <div key={`${item.version}-${idx}`} className="flex items-center gap-3">
                <div className="flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
                <div className="flex-1 rounded-sm border p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.version}</span>
                    <Badge
                      className={
                        statusTone[item.status.toLowerCase() as keyof typeof statusTone] ??
                        statusTone.healthy
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">Duration: {item.duration}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  summary,
  tone,
}: {
  title: string;
  summary: React.ReactNode;
  tone: "healthy" | "warning" | "error";
}) {
  return (
    <Card
      className={cn(
        tone === "warning" && "border-amber-500/40",
        tone === "error" && "border-rose-500/40",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>{summary}</CardContent>
    </Card>
  );
}
