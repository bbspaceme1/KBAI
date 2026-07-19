import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  getBugReports,
  summarizeWithGPT,
  triggerClaudeAudit,
  getAuditJobStatus,
  getAuditResult,
  executeViaV0,
  executeViaCopilot,
  approvePullRequest,
  getOrchestrationLogs,
} from "@/lib/orchestration.functions";

export const Route = createFileRoute("/_app/admin/orchestration")({
  component: OrchestrationPage,
});

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  created_at: string;
  status: "open" | "acknowledged" | "in_progress" | "resolved";
}

function OrchestrationPage() {
  const auth = useAuth();
  const qc = useQueryClient();

  // Section 1: Bug Reports
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [gptSummary, setGptSummary] = useState<string>("");

  // Section 2: Audit
  const [auditJobId, setAuditJobId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<string>("idle");
  const [auditResult, setAuditResult] = useState<string>("");

  // Section 3: Review & Execute
  const [editablePrompt, setEditablePrompt] = useState<string>("");
  const [sensitiveFilesDetected, setSensitiveFilesDetected] = useState<string[]>([]);

  // Section 4: PR & Merge
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  const [prStatus, setPrStatus] = useState<string>("none");

  // Queries
  const bugsQ = useQuery({
    queryKey: ["bug-reports"],
    enabled: !!auth.user?.id,
    queryFn: () => getBugReports(),
  });

  const logsQ = useQuery({
    queryKey: ["orchestration-logs"],
    enabled: !!auth.user?.id,
    queryFn: () => getOrchestrationLogs(),
    refetchInterval: 5000,
  });

  // Mutations
  const summarizeMut = useMutation({
    mutationFn: async (bugId: string) => {
      const result = await summarizeWithGPT(bugId);
      return result;
    },
    onSuccess: (data) => {
      setGptSummary(data.summary);
      toast.success("Ringkasan GPT berhasil dibuat");
    },
    onError: (e) => toast.error(`Gagal meringkas: ${e.message}`),
  });

  const auditMut = useMutation({
    mutationFn: async () => {
      const { jobId } = await triggerClaudeAudit(gptSummary);
      return jobId;
    },
    onSuccess: (jobId) => {
      setAuditJobId(jobId);
      setAuditStatus("queued");
      toast.success("Claude Audit job dimulai");
      pollAuditStatus(jobId);
    },
    onError: (e) => toast.error(`Gagal trigger audit: ${e.message}`),
  });

  const v0Mut = useMutation({
    mutationFn: async () => {
      const { prUrl, files, detected } = await executeViaV0(editablePrompt);
      setSensitiveFilesDetected(detected);
      if (detected.length > 0) {
        throw new Error(`Detected sensitive files: ${detected.join(", ")}`);
      }
      setPullRequestUrl(prUrl);
      setPrStatus("pending");
      return prUrl;
    },
    onSuccess: () => {
      toast.success("PR created via v0 - menunggu approval");
    },
    onError: (e) => toast.error(`Gagal execute v0: ${e.message}`),
  });

  const copilotMut = useMutation({
    mutationFn: async () => {
      const { prUrl, files, detected } = await executeViaCopilot(editablePrompt);
      setSensitiveFilesDetected(detected);
      if (detected.length > 0) {
        throw new Error(`Detected sensitive files: ${detected.join(", ")}`);
      }
      setPullRequestUrl(prUrl);
      setPrStatus("pending");
      return prUrl;
    },
    onSuccess: () => {
      toast.success("PR created via Copilot - menunggu approval");
    },
    onError: (e) => toast.error(`Gagal execute Copilot: ${e.message}`),
  });

  const mergeMut = useMutation({
    mutationFn: async () => {
      const result = await approvePullRequest(pullRequestUrl!);
      return result;
    },
    onSuccess: () => {
      setPrStatus("merged");
      toast.success("PR merged ke main - deployment dimulai");
      setPullRequestUrl(null);
    },
    onError: (e) => toast.error(`Gagal merge PR: ${e.message}`),
  });

  async function pollAuditStatus(jobId: string) {
    let attempts = 0;
    const maxAttempts = 120; // 10 menit dengan interval 5 detik

    const poll = async () => {
      try {
        const status = await getAuditJobStatus(jobId);
        setAuditStatus(status);

        if (status === "completed") {
          const result = await getAuditResult(jobId);
          setAuditResult(result.markdown);
          setEditablePrompt(result.markdown);
          return;
        }

        if (status === "failed") {
          toast.error("Claude Audit gagal");
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch (e) {
        console.error("[v0] Audit polling error:", e);
      }
    };

    poll();
  }

  const selectedBug = bugsQ.data?.find((b) => b.id === selectedBugId);
  const canExecute =
    editablePrompt && sensitiveFilesDetected.length === 0 && prStatus !== "pending";
  const canMerge = pullRequestUrl && prStatus === "pending";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Orchestration</h1>
        <Badge variant="outline">Manual Trigger</Badge>
      </div>

      {/* Section 1: Bug Reports */}
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <AlertCircle className="h-4 w-4" /> Bug Reports from Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {bugsQ.isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {bugsQ.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada bug report</p>
          )}
          {bugsQ.data?.map((bug) => (
            <div
              key={bug.id}
              className="flex items-start justify-between rounded border border-border p-3 hover:bg-muted/50 cursor-pointer transition"
              onClick={() => setSelectedBugId(bug.id)}
            >
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{bug.title}</p>
                <p className="text-xs text-muted-foreground">{bug.description}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(bug.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={bug.severity === "CRITICAL" ? "destructive" : "secondary"}>
                  {bug.severity}
                </Badge>
                <Badge variant="outline">{bug.status}</Badge>
              </div>
            </div>
          ))}

          {selectedBug && (
            <div className="mt-4 space-y-3 rounded bg-muted p-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold">Ringkasan dengan GPT:</p>
                {gptSummary && (
                  <div className="rounded bg-background p-2">
                    <p className="text-xs whitespace-pre-wrap">{gptSummary}</p>
                  </div>
                )}
                <Button
                  onClick={() => summarizeMut.mutate(selectedBugId!)}
                  disabled={summarizeMut.isPending}
                  className="w-full"
                  size="sm"
                >
                  {summarizeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ringkas dengan GPT
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Claude Audit */}
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <Clock className="h-4 w-4" /> Full Audit by Claude Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-mono font-semibold">{auditStatus}</span>
            </p>
            {auditStatus && auditStatus !== "idle" && (
              <div className="flex items-center gap-2">
                {auditStatus === "queued" && (
                  <Badge variant="secondary" className="animate-pulse">
                    <Clock className="mr-1 h-3 w-3" /> Queued
                  </Badge>
                )}
                {auditStatus === "running" && (
                  <Badge className="animate-pulse">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Running
                  </Badge>
                )}
                {auditStatus === "completed" && (
                  <Badge variant="default">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                  </Badge>
                )}
                {auditStatus === "failed" && <Badge variant="destructive">Failed</Badge>}
              </div>
            )}
            <Button
              onClick={() => auditMut.mutate()}
              disabled={!gptSummary || auditMut.isPending || auditStatus === "running"}
              className="w-full"
            >
              {auditMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Jalankan Claude Code Audit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Review & Execute */}
      {editablePrompt && (
        <Card className="rounded-sm border-border">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
              <CheckCircle2 className="h-4 w-4" /> Review & Execute Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {sensitiveFilesDetected.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sensitive files detected: {sensitiveFilesDetected.join(", ")}. Execution disabled.
                </AlertDescription>
              </Alert>
            )}

            <Textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              rows={15}
              className="font-mono text-xs"
              placeholder="Edit prompt here if needed..."
            />

            <div className="flex gap-2">
              <Button
                onClick={() => v0Mut.mutate()}
                disabled={!canExecute || v0Mut.isPending}
                className="flex-1"
              >
                {v0Mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Execute via v0
              </Button>
              <Button
                onClick={() => copilotMut.mutate()}
                disabled={!canExecute || copilotMut.isPending}
                className="flex-1"
                variant="secondary"
              >
                {copilotMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Execute via Copilot
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: PR & Merge */}
      {pullRequestUrl && (
        <Card className="rounded-sm border-border">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
              <CheckCircle2 className="h-4 w-4" /> Commit Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold">Pull Request:</p>
              <a
                href={pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 underline hover:text-blue-600"
              >
                {pullRequestUrl}
              </a>
            </div>

            <div className="flex items-center justify-between rounded bg-muted p-2">
              <span className="text-xs font-semibold">Status: {prStatus}</span>
              {prStatus === "pending" && (
                <Badge variant="secondary" className="animate-pulse">
                  Waiting Approval
                </Badge>
              )}
              {prStatus === "merged" && <Badge variant="default">Merged</Badge>}
            </div>

            <Button
              onClick={() => mergeMut.mutate()}
              disabled={!canMerge || mergeMut.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {mergeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Merge to Main
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {logsQ.data && logsQ.data.length > 0 && (
        <Card className="rounded-sm border-border">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Orchestration Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {logsQ.data.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="text-xs text-muted-foreground border-b border-border pb-2 last:border-0"
              >
                <p>
                  <span className="font-semibold">{log.action}</span> by {log.performed_by} at{" "}
                  {format(new Date(log.performed_at), "HH:mm:ss")}
                </p>
                {log.result && <p className="text-xs opacity-75">Result: {log.result}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
