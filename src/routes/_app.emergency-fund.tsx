import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CircleAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  computeEmergencyFund,
  levelCopy,
  type EmergencyFundInput,
  type EmergencyFundResult,
} from "@/lib/emergency-fund-engine";

export const Route = createFileRoute("/_app/emergency-fund")({ component: EmergencyFundPage });

const DEMO_INPUT: EmergencyFundInput = {
  essentialMonthlyExpenses: 5_000_000,
  primaryIncomeSource: "employee",
  incomeStability: "stable",
  dependentBand: "0",
  debtStatus: "none",
  currentLiquidReserve: 10_000_000,
  physicalGoldValue: 0,
};

function EmergencyFundPage() {
  const [result] = useState<EmergencyFundResult>(() => computeEmergencyFund(DEMO_INPUT));
  const copy = levelCopy[result.level];
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">KBAI-EF-1.0</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Dana Darurat</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Bangun penyangga finansial untuk kejadian tak terduga dan gangguan penghasilan.
          </p>
        </div>
        <Button asChild>
          <Link to="/emergency-fund/setup">
            Perbarui data <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Preview metodologi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lengkapi setup untuk menyimpan perhitungan personal. Preview ini tidak tersimpan dan
              tidak menggantikan hasil personal Anda.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          title="Target dana darurat"
          value={`Rp${result.targetFund.toLocaleString("id-ID")}`}
          detail={`${result.targetMonths} bulan kebutuhan`}
        />
        <Metric
          title="Dana likuid saat ini"
          value={`Rp${result.currentLiquidReserve.toLocaleString("id-ID")}`}
          detail={`±${result.monthsCovered.toFixed(2)} bulan tercakup`}
        />
        <Metric
          title="Coverage"
          value={`${result.coveragePercent.toFixed(2)}%`}
          detail={
            result.fundingGap
              ? `Gap Rp${result.fundingGap.toLocaleString("id-ID")}`
              : "Target tercapai"
          }
        />
      </div>
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Resilience level
            </p>
            <h3 className="mt-2 text-2xl font-semibold">{copy.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
          </div>
          <div className="rounded-full border border-border px-4 py-2 text-sm font-medium">
            {result.level.replace("_", " ")}
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(result.coveragePercent, 100)}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>100% target</span>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Info
          title="Emas fisik"
          value={`Rp${result.physicalGoldValue.toLocaleString("id-ID")}`}
          detail="Ditampilkan terpisah dan tidak masuk coverage inti."
        />
        <Info
          title="Bagaimana ini dihitung?"
          value={`Skor risiko ${result.riskScore}`}
          detail="EME, stabilitas penghasilan, tanggungan, utang, dan versi metodologi dijelaskan setelah setup."
        />
      </div>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <CircleAlert className="h-4 w-4 shrink-0" />
        <p>
          Perhitungan ini bersifat edukatif berdasarkan data yang Anda masukkan. Bukan nasihat
          keuangan, investasi, atau pajak.
        </p>
      </div>
    </div>
  );
}
function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-3 font-mono text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
function Info({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-3 font-medium">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
