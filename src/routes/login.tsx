import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth";
import { recordSession, writeAuditLog } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase, supabaseConfigError } from "@/integrations/supabase/client";

declare global {
  interface Window {
    onTelegramAuth?: (payload: Record<string, string>) => void;
  }
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [today, setToday] = useState<string>("");
  const [telegramState, setTelegramState] = useState<"idle" | "connecting" | "checking" | "channel" | "groups" | "verified" | "error">("idle");
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [missingGroups, setMissingGroups] = useState<Array<{ title: string; inviteUrl: string | null }>>([]);

  const verifyTelegram = async (telegramLogin: Record<string, string>) => {
    setTelegramState("checking");
    setTelegramMessage(null);
    try {
      const response = await fetch("/api/telegram/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telegram_login: telegramLogin }),
      });
      const result = await response.json();
      if (result.status === "CHANNEL_REQUIRED") {
        setTelegramState("channel");
        setTelegramMessage(result.contact_admin_url ?? "Akses channel resmi dikelola admin komunitas.");
      } else if (result.status === "GROUPS_REQUIRED") {
        setTelegramState("groups");
        setMissingGroups(result.missing_groups ?? []);
      } else if (result.status === "VERIFIED") {
        setTelegramState("verified");
        navigate({ to: "/community" });
      } else {
        setTelegramState("error");
        setTelegramMessage("Verifikasi Telegram sementara tidak tersedia. Silakan coba lagi.");
      }
    } catch {
      setTelegramState("error");
      setTelegramMessage("Verifikasi Telegram sementara tidak tersedia. Silakan coba lagi.");
    }
  };

  useEffect(() => {
    window.onTelegramAuth = (telegramLogin: Record<string, string>) => verifyTelegram(telegramLogin);
    const container = document.getElementById("telegram-login-widget");
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
    if (container && botUsername) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.dataset.telegramLogin = botUsername;
      script.dataset.size = "large";
      script.dataset.onauth = "onTelegramAuth(user)";
      script.dataset.requestAccess = "write";
      container.appendChild(script);
    }
    return () => {
      delete window.onTelegramAuth;
      container?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    setToday(format(new Date(), "dd MMM yyyy"));
  }, []);

  // If already authenticated, redirect (side effect, not during render)
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      navigate({ to: "/community" });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  const handleResetPassword = async () => {
    if (!username.trim()) {
      toast.error("Masukkan username/email terlebih dahulu");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(username.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Link reset password telah dikirim ke email kamu");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim link reset";
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await auth.signIn(username.trim(), password);
      // Record session + audit (best-effort, non-blocking failure)
      try {
        const { data } = await (
          await import("@/integrations/supabase/client")
        ).supabase.auth.getUser();
        if (data.user) {
          await Promise.all([
            recordSession({
              username: username.trim(),
              user_agent: navigator.userAgent,
            }).catch(() => null),
            writeAuditLog({
              username: username.trim(),
              action: "auth.login",
              user_agent: navigator.userAgent,
            }).catch(() => null),
          ]);
        }
      } catch {
        /* swallow */
      }
      toast.success("Berhasil masuk");
      navigate({ to: "/community" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      if (msg === "MFA_REQUIRED") {
        toast.error("Admin/Advisor harus mengaktifkan 2FA. Redirecting ke setup...");
        navigate({ to: "/settings" });
        return;
      }
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("fetch")
      ) {
        toast.error(
          "Koneksi ke Supabase gagal. Periksa VITE_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di environment.",
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        {supabaseConfigError ? (
          <div className="mb-4 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {supabaseConfigError}
          </div>
        ) : null}
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
            <h1 className="text-[13px] font-semibold uppercase tracking-[0.14em]">Sign in</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Akses dengan kredensial yang diberikan admin.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3.5 px-5 py-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="email"
                className="h-9 rounded-sm border-border bg-background text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-9 rounded-sm border-border bg-background text-[13px]"
              />
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Lupa Password?
              </button>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 w-full rounded-sm bg-foreground text-[12px] font-semibold uppercase tracking-[0.14em] text-background hover:bg-foreground/90"
            >
              {submitting ? "Authenticating…" : "Sign in"}
            </Button>
          </form>
          <div className="border-t border-border px-5 py-4">
            <div className="mb-3 flex items-center gap-2 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              <span>or</span>
            </div>
            <div className="rounded-sm border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/20">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium">
                <Send className="h-3.5 w-3.5 text-sky-600" />
                Login dengan Telegram
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
                Verifikasi akun Telegram dan membership komunitas sebelum akses diberikan.
              </p>
              {telegramState === "idle" || telegramState === "connecting" ? (
                <div className="flex min-h-10 items-center justify-center" id="telegram-login-widget">
                  {telegramState === "connecting" ? (
                    <span className="text-[11px] text-muted-foreground">Connecting to Telegram...</span>
                  ) : typeof window !== "undefined" && import.meta.env.VITE_TELEGRAM_BOT_USERNAME ? (
                    null
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Telegram login sedang disiapkan oleh admin.</span>
                  )}
                </div>
              ) : telegramState === "checking" ? (
                <p className="text-[11px] text-muted-foreground">Checking KBAI community membership...</p>
              ) : telegramState === "channel" ? (
                <div className="space-y-2 text-[11px]">
                  <p className="font-medium">Channel belum terverifikasi.</p>
                  <p className="text-muted-foreground">{telegramMessage}</p>
                  <button type="button" onClick={() => setTelegramState("idle")} className="text-sky-700 underline">Check Again</button>
                </div>
              ) : telegramState === "groups" ? (
                <div className="space-y-2 text-[11px]">
                  <p className="font-medium">You still need to join:</p>
                  {missingGroups.map((group) => <a key={group.title} href={group.inviteUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="block text-sky-700 underline">Join {group.title}</a>)}
                  <button type="button" onClick={() => setTelegramState("idle")} className="text-sky-700 underline">Check Again</button>
                </div>
              ) : telegramState === "verified" ? (
                <p className="text-[11px] text-emerald-700">Telegram verified. Redirecting...</p>
              ) : (
                <div className="space-y-2 text-[11px]"><p className="text-destructive">{telegramMessage}</p><button type="button" onClick={() => setTelegramState("idle")} className="text-sky-700 underline">Retry</button></div>
              )}
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">Hubungi admin komunitas jika akses channel belum tersedia.</p>
          </div>
        </div>

        <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span>Session · secure</span>
          <span suppressHydrationWarning>{today || "—"}</span>
        </div>
      </div>
    </div>
  );
}
