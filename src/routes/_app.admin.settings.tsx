import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/auth";
import { adminListSettings, adminUpdateSetting, fetchSmfNav } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_app/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [smfFundId, setSmfFundId] = useState("2057");

  const settingsQ = useQuery({
    queryKey: ["system-settings"],
    enabled: !!auth.user?.id,
    queryFn: () => adminListSettings(),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { key: string; value: unknown }) =>
      adminUpdateSetting({ key: vars.key, value: vars.value }),
    onSuccess: () => {
      toast.success("Setting tersimpan");
      qc.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const smfMut = useMutation({
    mutationFn: () => fetchSmfNav({ fund_id: smfFundId }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <Settings className="h-4 w-4" /> System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {settingsQ.isLoading && <p className="text-[12px] text-muted-foreground">Memuat...</p>}
          {(settingsQ.data ?? []).map((s) => (
            <SettingEditor
              key={s.key}
              k={s.key}
              initialValue={s.value}
              updatedAt={s.updated_at}
              onSave={(value) => updateMut.mutate({ key: s.key, value })}
              isSaving={updateMut.isPending}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <Database className="h-4 w-4" /> SMF Reksadana NAV (pasardana.id)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Fund ID
              </Label>
              <Input
                value={smfFundId}
                onChange={(e) => setSmfFundId(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="2057"
                className="h-9 text-[12px]"
              />
            </div>
            <Button onClick={() => smfMut.mutate()} disabled={smfMut.isPending}>
              <RefreshCw
                className={smfMut.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              />
              Tarik NAV
            </Button>
          </div>
          {smfMut.data && smfMut.data.ok && (
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {smfMut.data.count} titik · ditampilkan 30 terakhir
              </div>
              <div className="font-mono text-[11px] max-h-64 overflow-auto">
                {smfMut.data.data.map((d, i) => (
                  <div key={i} className="flex justify-between border-b border-border/50 py-1">
                    <span className="text-muted-foreground">{d.date}</span>
                    <span>{d.nav?.toLocaleString("id-ID", { maximumFractionDigits: 4 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {smfMut.data && !smfMut.data.ok && (
            <p className="text-[12px] text-neg">
              Gagal: {smfMut.data.error}. Endpoint pasardana.id mungkin memblokir akses dari server.
              Coba ID lain atau gunakan input manual.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingEditor({
  k,
  initialValue,
  updatedAt,
  onSave,
  isSaving,
}: {
  k: string;
  initialValue: unknown;
  updatedAt: string;
  onSave: (v: unknown) => void;
  isSaving: boolean;
}) {
  const [text, setText] = useState(JSON.stringify(initialValue, null, 2));
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    try {
      const parsed = JSON.parse(text);
      setErr(null);
      onSave(parsed);
    } catch {
      setErr("Format JSON tidak valid");
    }
  };

  return (
    <div className="rounded-sm border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-mono text-[12px] font-semibold">{k}</div>
          <div className="text-[10px] text-muted-foreground">
            updated {format(new Date(updatedAt), "dd MMM HH:mm", { locale: idLocale })}
          </div>
        </div>
        <Button size="sm" onClick={save} disabled={isSaving}>
          <Save className="h-3 w-3" /> Simpan
        </Button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-mono text-[11px] min-h-[100px]"
      />
      {err && <p className="text-[11px] text-neg mt-1">{err}</p>}
    </div>
  );
}
