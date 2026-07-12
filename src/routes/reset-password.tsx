import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    access_token: (search.access_token as string) || "",
    refresh_token: (search.refresh_token as string) || "",
    type: (search.type as string) || "",
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { access_token, refresh_token, type } = useSearch({ from: "/reset-password" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If we have tokens from URL, set the session
    if (access_token && refresh_token && type === "recovery") {
      supabase.auth.setSession({
        access_token,
        refresh_token,
      });
    }
  }, [access_token, refresh_token, type]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Password tidak cocok");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success("Password berhasil diubah");
      navigate({ to: "/login" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah password";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card">
            <Activity className="h-4 w-4 text-foreground" />
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-wide">KBAI Terminal</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Keluarga Besar Awas Indeks
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h1 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Reset Password
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Masukkan password baru untuk akun kamu.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3.5 px-5 py-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="newPassword"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Password Baru
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-9 rounded-sm border-border bg-background text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Konfirmasi Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-9 rounded-sm border-border bg-background text-[13px]"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 w-full rounded-sm bg-foreground text-[12px] font-semibold uppercase tracking-[0.14em] text-background hover:bg-foreground/90"
            >
              {submitting ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
