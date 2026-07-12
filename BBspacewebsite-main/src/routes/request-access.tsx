import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/request-access")({
  component: RequestAccessPage,
});

function RequestAccessPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    investmentBackground: "beginner",
    sourceReferral: "landing",
    additionalInfo: "",
  });
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
      // Insert into access_requests table (create this in Supabase)
      const { error } = await supabase.from("access_requests" as never).insert({
        full_name: formData.fullName,
        email: formData.email,
        investment_background: formData.investmentBackground,
        source_referral: formData.sourceReferral,
        additional_info: formData.additionalInfo,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Permintaan akses terkirim!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim permintaan";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[480px]">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="rounded-sm border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h1 className="text-[13px] font-semibold uppercase tracking-[0.14em]">
              Daftar Akses KBAI
            </h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Bergabunglah dengan komunitas investor berbasis data kami. Admin akan merekomendasikan
              status dalam 24-48 jam.
            </p>
          </div>

          <div className="px-5 py-5">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fullName"
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Nama Lengkap
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Budi Santoso"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    disabled={submitting}
                    className="text-[13px]"
                  />
                </div>

                {/* Email */}
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
                    placeholder="budi@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={submitting}
                    className="text-[13px]"
                  />
                </div>

                {/* Investment Background */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="background"
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Pengalaman Investasi
                  </Label>
                  <Select
                    value={formData.investmentBackground}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        investmentBackground: value,
                      })
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger className="text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Pemula (0-1 tahun)</SelectItem>
                      <SelectItem value="intermediate">Menengah (1-3 tahun)</SelectItem>
                      <SelectItem value="advanced">Mahir (3-5 tahun)</SelectItem>
                      <SelectItem value="expert">Expert (5+ tahun)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Referral */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="referral"
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Darimana Kamu Mengenal KBAI?
                  </Label>
                  <Select
                    value={formData.sourceReferral}
                    onValueChange={(value) => setFormData({ ...formData, sourceReferral: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger className="text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing">Website Landing Page</SelectItem>
                      <SelectItem value="referral">Referral dari Member</SelectItem>
                      <SelectItem value="social">Media Sosial</SelectItem>
                      <SelectItem value="search">Search Engine</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Additional Info */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="info"
                    className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Informasi Tambahan (Opsional)
                  </Label>
                  <Textarea
                    id="info"
                    placeholder="Ceritakan latar belakang investasi kamu atau pertanyaan khusus untuk admin..."
                    value={formData.additionalInfo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        additionalInfo: e.target.value,
                      })
                    }
                    disabled={submitting}
                    className="text-[13px] min-h-[80px]"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full text-[13px]">
                  {submitting ? "Mengirim..." : "Kirim Permintaan Akses"}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  Sudah punya akses?{" "}
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/login" })}
                    className="text-accent hover:underline"
                  >
                    Masuk
                  </button>
                </p>
              </form>
            ) : (
              <div className="space-y-4 py-6">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-[14px] font-semibold">Permintaan Terkirim!</h2>
                  <p className="text-[12px] text-muted-foreground">
                    Terima kasih telah mendaftar untuk KBAI. Admin kami akan meninjau permintaan
                    akses kamu dalam <span className="font-medium">24-48 jam</span>.
                  </p>
                  <div className="rounded-sm bg-blue-500/10 border border-blue-500/20 p-3 text-left">
                    <p className="text-[11px] text-blue-600 font-medium">
                      📧 Konfirmasi telah dikirim ke:
                    </p>
                    <p className="text-[12px] font-medium text-foreground break-all mt-2">
                      {formData.email}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Kami akan menghubungimu melalui email dengan next steps.
                  </p>
                </div>

                <Button
                  className="w-full text-[13px]"
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                >
                  Kembali ke Beranda
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
