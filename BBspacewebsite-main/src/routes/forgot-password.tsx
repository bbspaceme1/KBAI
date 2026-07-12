import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      navigate({ to: "/community" });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Link reset password telah dikirim ke email kamu");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim reset link";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <button
          onClick={() => navigate({ to: "/login" })}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke login
        </button>

        <div className="rounded-sm border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h1 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Reset Password
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Masukkan email untuk menerima link reset password.
            </p>
          </div>

          <div className="px-5 py-5">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="kamu@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                    className="text-[13px]"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full text-[13px]">
                  {submitting ? "Mengirim..." : "Kirim Link Reset"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 py-6">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-[14px] font-semibold">Link telah dikirim</h2>
                  <p className="text-[12px] text-muted-foreground">
                    Kami telah mengirimkan link reset password ke:
                  </p>
                  <p className="text-[12px] font-medium text-foreground break-all">{email}</p>
                  <p className="text-[11px] text-muted-foreground pt-2">
                    Link berlaku selama 24 jam. Jika tidak menerima email, cek folder spam.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-[13px]"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Kembali ke Login
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Ingat kredensial kamu?{" "}
          <button
            onClick={() => navigate({ to: "/login" })}
            className="text-accent hover:underline"
          >
            Masuk
          </button>
        </p>
      </div>
    </div>
  );
}
