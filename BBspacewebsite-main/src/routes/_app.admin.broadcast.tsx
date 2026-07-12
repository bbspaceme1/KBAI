import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Megaphone, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/_app/admin/broadcast")({
  component: BroadcastAdminPage,
});

function BroadcastAdminPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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

  useEffect(() => {
    if (latestQ.data) {
      setTitle(latestQ.data.title);
      setBody(latestQ.data.body);
    }
  }, [latestQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      if (!trimmedTitle) throw new Error("Judul broadcast tidak boleh kosong");
      if (trimmedBody.length < 10) throw new Error("Pesan broadcast minimal 10 karakter");

      if (latestQ.data?.id) {
        const { error } = await supabase
          .from("broadcasts")
          .update({
            title: trimmedTitle,
            body: trimmedBody,
            posted_by: auth.user!.id,
            posted_by_username: auth.username ?? auth.user!.email ?? "advisor",
            updated_at: new Date().toISOString(),
          })
          .eq("id", latestQ.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("broadcasts").insert({
          title: trimmedTitle,
          body: trimmedBody,
          posted_by: auth.user!.id,
          posted_by_username: auth.username ?? auth.user!.email ?? "advisor",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Broadcast tersimpan");
      qc.invalidateQueries({ queryKey: ["latest-broadcast"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!latestQ.data?.id) throw new Error("Tidak ada broadcast untuk dihapus");
      const { error } = await supabase.from("broadcasts").delete().eq("id", latestQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast dihapus");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["latest-broadcast"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="rounded-sm border-border lg:col-span-2">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <Megaphone className="h-4 w-4" /> Compose Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="b-title">Judul</Label>
            <Input
              id="b-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Update pasar 1 Mei 2026"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-body">Pesan</Label>
            <Textarea
              id="b-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Tulis insight pasar / arahan portofolio untuk semua member..."
              className="font-mono text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Broadcast lama otomatis terhapus saat kamu kirim broadcast baru.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!title.trim() || !body.trim() || saveMut.isPending}
            >
              {saveMut.isPending ? "Mengirim..." : "Kirim Broadcast"}
            </Button>
            {latestQ.data && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Hapus broadcast saat ini?")) deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm border-border">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            Broadcast Aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-5">
          {latestQ.data ? (
            <>
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {format(new Date(latestQ.data.created_at), "EEE, dd MMM yyyy HH:mm", {
                  locale: idLocale,
                })}
              </div>
              <div className="text-[11px] text-muted-foreground">
                oleh @{latestQ.data.posted_by_username}
              </div>
              <h3 className="pt-2 text-[14px] font-semibold">{latestQ.data.title}</h3>
              <p className="whitespace-pre-wrap text-[13px] text-foreground/85">
                {latestQ.data.body}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">Belum ada broadcast aktif.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
