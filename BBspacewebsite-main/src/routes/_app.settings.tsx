import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataState } from "@/components/data-state";
import { ShieldCheck, Bell, Trash2, Plus, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { start2faSetup, verify2faSetup, disable2fa, get2faStatus } from "@/lib/twofa.functions";
import { listPriceAlerts, createPriceAlert, deletePriceAlert } from "@/lib/notifications.functions";
import { softDeleteUser, exportUserData } from "@/lib/data-privacy.functions";
import { toast } from "sonner";
import QRCode from "qrcode";

export const Route = createFileRoute("/_app/settings")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Akun
        </div>
        <h2 className="mt-1 font-serif text-h1 font-semibold tracking-tight">Settings</h2>
        <p className="mt-1.5 text-caption text-muted-foreground">
          Kelola keamanan akun & notifikasi.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TwoFactorCard />
        <PriceAlertsCard />
      </div>

      <DataPrivacyCard />
    </div>
  );
}

function TwoFactorCard() {
  const qc = useQueryClient();
  const status = get2faStatus;
  const start = start2faSetup;
  const verify = verify2faSetup;
  const disable = disable2fa;

  const statusQ = useQuery({ queryKey: ["2fa-status"], queryFn: () => status() });
  const [setup, setSetup] = useState<{ otpauth_url: string; secret: string; qr: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const startMut = useMutation({
    mutationFn: () => start(),
    onSuccess: async (d) => {
      const qr = await QRCode.toDataURL(d.otpauth_url, { margin: 1, width: 200 });
      setSetup({ ...d, qr });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: () => verify({ code }),
    onSuccess: (d: { ok: boolean; recovery_codes: string[] }) => {
      setRecovery(d.recovery_codes);
      setSetup(null);
      setCode("");
      qc.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("2FA aktif");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disableMut = useMutation({
    mutationFn: () => disable(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("2FA dinonaktifkan");
    },
  });

  const enabled = !!statusQ.data?.enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-h2">
          <ShieldCheck className="h-4 w-4" /> Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataState
          isLoading={statusQ.isLoading}
          isError={statusQ.isError}
          data={statusQ.data}
          skeletonRows={2}
        >
          {(s) => (
            <>
              <div className="flex items-center justify-between rounded-sm border border-border bg-card/40 px-3 py-2">
                <div>
                  <div className="text-body font-semibold">
                    {s.enabled ? "Aktif" : "Belum aktif"}
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {s.enabled
                      ? `Terdaftar ${s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString("id-ID") : ""}`
                      : "Lindungi akun dengan kode TOTP dari Google/Microsoft Authenticator."}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => {
                    if (v && !setup) startMut.mutate();
                    else if (!v && enabled) disableMut.mutate();
                  }}
                  aria-label="Toggle 2FA"
                />
              </div>

              {setup && (
                <div className="space-y-3 rounded-sm border border-border bg-card/40 p-3">
                  <p className="text-caption text-muted-foreground">
                    Scan QR code dengan authenticator app, lalu masukkan 6-digit kode.
                  </p>
                  <div className="flex items-start gap-3">
                    <img
                      src={setup.qr}
                      alt="QR 2FA"
                      className="h-32 w-32 rounded-sm bg-white p-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Label className="text-caption">Manual key</Label>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 break-all rounded-sm bg-muted px-2 py-1 font-mono text-[10px]">
                          {setup.secret}
                        </code>
                        <button
                          type="button"
                          aria-label="Salin kunci"
                          onClick={() => {
                            navigator.clipboard.writeText(setup.secret);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="rounded-sm border border-border p-1 text-muted-foreground hover:text-foreground"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="123456"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      className="font-mono"
                      inputMode="numeric"
                    />
                    <Button
                      onClick={() => verifyMut.mutate()}
                      disabled={code.length !== 6 || verifyMut.isPending}
                    >
                      Verifikasi
                    </Button>
                  </div>
                </div>
              )}

              {recovery && (
                <div className="rounded-sm border border-pos/40 bg-pos/10 p-3">
                  <h4 className="text-body font-semibold">Recovery codes</h4>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Simpan baik-baik. Setiap kode hanya bisa dipakai sekali.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-caption">
                    {recovery.map((c) => (
                      <code key={c} className="rounded-sm bg-background px-2 py-1">
                        {c}
                      </code>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 gap-1 text-caption"
                    onClick={() => {
                      navigator.clipboard.writeText(recovery.join("\n"));
                      toast.success("Disalin");
                    }}
                  >
                    <Copy className="h-3 w-3" /> Salin semua
                  </Button>
                </div>
              )}
            </>
          )}
        </DataState>
      </CardContent>
    </Card>
  );
}

function PriceAlertsCard() {
  const qc = useQueryClient();
  const list = listPriceAlerts;
  const create = createPriceAlert;
  const del = deletePriceAlert;

  const q = useQuery({ queryKey: ["price-alerts"], queryFn: () => list() });
  const [ticker, setTicker] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      create({ ticker: ticker.toUpperCase(), condition, threshold: Number(threshold) }),
    onSuccess: () => {
      setTicker("");
      setThreshold("");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
      toast.success("Alert dibuat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-alerts"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-h2">
          <Bell className="h-4 w-4" /> Price Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr_120px_1fr_auto] gap-2">
          <Input
            placeholder="BBCA"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            className="font-mono uppercase"
            maxLength={6}
          />
          <Select value={condition} onValueChange={(v) => setCondition(v as "above" | "below")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">≥</SelectItem>
              <SelectItem value="below">≤</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="9500"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            inputMode="decimal"
          />
          <Button
            size="icon"
            onClick={() => createMut.mutate()}
            disabled={!ticker || !threshold || createMut.isPending}
            aria-label="Tambah alert"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <DataState
          isLoading={q.isLoading}
          isError={q.isError}
          data={q.data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="Belum ada alert"
          emptyDescription="Buat alert untuk mendapat notifikasi saat harga menyentuh threshold."
          emptyIcon={<Bell className="h-4 w-4 text-muted-foreground" />}
        >
          {(items) => (
            <ul className="divide-y divide-border rounded-sm border border-border">
              {items.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2 text-body">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{a.ticker}</span>
                    <span className="text-muted-foreground">
                      {a.condition === "above" ? "≥" : "≤"}{" "}
                      <span className="font-mono">
                        {Number(a.threshold).toLocaleString("id-ID")}
                      </span>
                    </span>
                    {a.triggered_at && (
                      <span className="rounded-sm bg-pos/20 px-1.5 py-0.5 text-[10px] text-pos">
                        triggered
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => delMut.mutate(a.id)}
                    aria-label="Hapus"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </CardContent>
    </Card>
  );
}

function DataPrivacyCard() {
  const exportData = exportUserData;
  const softDelete = softDeleteUser;

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const exportMut = useMutation({
    mutationFn: () => exportData(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bb-space-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data berhasil diekspor");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => softDelete(),
    onSuccess: () => {
      toast.success("Akun berhasil dinonaktifkan. Anda akan logout dalam 5 detik.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 5000);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-h2">
          <ShieldCheck className="h-4 w-4" /> Data Privacy & GDPR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="rounded-sm border border-border bg-card/40 p-4">
            <h4 className="text-body font-semibold">Export Data</h4>
            <p className="mt-1 text-caption text-muted-foreground">
              Unduh semua data pribadi Anda dalam format JSON untuk backup atau audit.
            </p>
            <Button
              onClick={() => exportMut.mutate()}
              disabled={exportMut.isPending}
              className="mt-3"
              variant="outline"
            >
              {exportMut.isPending ? "Mengekspor..." : "Export Data"}
            </Button>
          </div>

          <div className="rounded-sm border border-neg/40 bg-neg/10 p-4">
            <h4 className="text-body font-semibold text-neg">Hapus Akun</h4>
            <p className="mt-1 text-caption text-muted-foreground">
              Nonaktifkan akun Anda secara permanen. Data akan dihapus setelah 30 hari sesuai GDPR.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="mt-3"
              >
                Hapus Akun
              </Button>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-caption text-neg font-medium">
                  Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => deleteMut.mutate()}
                    disabled={deleteMut.isPending}
                    variant="destructive"
                    size="sm"
                  >
                    {deleteMut.isPending ? "Menghapus..." : "Ya, Hapus Akun"}
                  </Button>
                  <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" size="sm">
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
