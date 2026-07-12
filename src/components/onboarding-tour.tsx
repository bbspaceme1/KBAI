import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Briefcase,
  Star,
  Newspaper,
  LineChart,
  Globe,
  Users,
  ChevronRight,
} from "lucide-react";

type Step = { icon: React.ComponentType<{ className?: string }>; title: string; body: string };

const MEMBER_STEPS: Step[] = [
  {
    icon: Users,
    title: "Selamat datang di KBAI Terminal",
    body: "Platform komunitas untuk tracking portfolio saham IDX dengan indeks komunitas KBAI.",
  },
  {
    icon: Briefcase,
    title: "Portfolio kamu",
    body: "Catat transaksi BUY/SELL, kelola cash, lihat P/L realtime. Mulai dari menu Portfolio.",
  },
  {
    icon: Star,
    title: "Watchlist",
    body: "Pantau saham tanpa harus hold. Tambahkan ticker yang sedang kamu pelajari.",
  },
  {
    icon: Newspaper,
    title: "Market Insight",
    body: "Broadcast dari Advisor — analisis pasar harian. Cek menu Market Insight.",
  },
];

const ADVISOR_STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Selamat datang Advisor",
    body: "Akses penuh ke modul EquiSight — research, valuasi, dan komunitas.",
  },
  {
    icon: LineChart,
    title: "Modul Analisis",
    body: "Screener, DCF Valuation, Earnings, Technical, Dividend — semua AI-powered.",
  },
  {
    icon: Globe,
    title: "Modul Ekonomi (BARU)",
    body: "Macro Indonesia, global markets, komoditas, AI brief harian.",
  },
];

const STORAGE_KEY = "kbai-onboarding-shown";

export function OnboardingTour() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const steps = auth.isAdvisor || auth.isAdmin ? ADVISOR_STEPS : MEMBER_STEPS;

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;
    let cancelled = false;
    (async () => {
      // Local session guard first
      if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) return;
      const { data } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", auth.user!.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.onboarded_at) {
        setOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.user, auth.isAdvisor, auth.isAdmin]);

  const finish = async () => {
    setOpen(false);
    if (auth.user) {
      await supabase
        .from("profiles")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", auth.user.id);
    }
  };

  if (!open) return null;
  const cur = steps[step]!;
  const Icon = cur.icon;
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-accent">
              <Icon className="h-4 w-4" />
            </span>
            <DialogTitle className="text-h2">{cur.title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-body text-muted-foreground">{cur.body}</p>
        <div className="mt-2 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="text-caption text-muted-foreground"
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="gap-1"
          >
            {isLast ? "Mulai" : "Lanjut"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
