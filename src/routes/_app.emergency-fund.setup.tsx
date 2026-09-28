import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  computeEmergencyFund,
  primaryIncomeOptions,
  type EmergencyFundInput,
} from "@/lib/emergency-fund-engine";

export const Route = createFileRoute("/_app/emergency-fund/setup")({
  component: EmergencyFundSetupPage,
});
const initial: EmergencyFundInput = {
  essentialMonthlyExpenses: 0,
  primaryIncomeSource: "employee",
  incomeStability: "stable",
  dependentBand: "0",
  debtStatus: "none",
  currentLiquidReserve: 0,
  physicalGoldValue: 0,
};
const steps = [
  "Pengeluaran wajib",
  "Sumber penghasilan",
  "Stabilitas penghasilan",
  "Tanggungan",
  "Utang",
  "Dana likuid",
  "Emas fisik",
] as const;

function EmergencyFundSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState(initial);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const result = useMemo(() => {
    try {
      return computeEmergencyFund(input);
    } catch {
      return null;
    }
  }, [input]);
  const set = <K extends keyof EmergencyFundInput>(key: K, value: EmergencyFundInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const next = () => {
    setError("");
    if (step === 0 && input.essentialMonthlyExpenses <= 0)
      return setError("Masukkan kebutuhan wajib bulanan lebih dari Rp0.");
    if (step < steps.length - 1) return setStep(step + 1);
    if (!consent) return setError("Persetujuan data diperlukan sebelum melanjutkan.");
    navigate({ to: "/emergency-fund" });
  };
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Setup {step + 1}/{steps.length}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{steps[step]}</h2>
        <div className="mt-4 h-1.5 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        {step === 0 && (
          <MoneyField
            id="expenses"
            label="Kebutuhan wajib per bulan"
            value={input.essentialMonthlyExpenses}
            onChange={(v) => set("essentialMonthlyExpenses", v)}
            helper="Termasuk cicilan wajib dan kebutuhan tanggungan. Tidak termasuk investasi, hiburan, atau barang yang bisa ditunda."
          />
        )}
        {step === 1 && (
          <Choice
            label="Sumber penghasilan"
            value={input.primaryIncomeSource}
            options={primaryIncomeOptions.map(([value, label]) => [value, label])}
            onChange={(v) =>
              set("primaryIncomeSource", v as EmergencyFundInput["primaryIncomeSource"])
            }
            helper="Untuk konteks saja. Tidak menentukan target Anda."
          />
        )}
        {step === 2 && (
          <Choice
            label="Stabilitas penghasilan"
            value={input.incomeStability}
            options={[
              ["very_stable", "Sangat stabil"],
              ["stable", "Stabil"],
              ["fluctuating", "Berfluktuasi"],
              ["irregular", "Tidak teratur"],
            ]}
            onChange={(v) => set("incomeStability", v as EmergencyFundInput["incomeStability"])}
            helper="Penghasilan dari trading atau investasi tidak dianggap stabil otomatis."
          />
        )}
        {step === 3 && (
          <Choice
            label="Tanggungan finansial"
            value={input.dependentBand}
            options={[
              ["0", "Tidak ada"],
              ["1-2", "1–2 orang"],
              ["3+", "3 orang atau lebih"],
            ]}
            onChange={(v) => set("dependentBand", v as EmergencyFundInput["dependentBand"])}
            helper="Orang yang secara finansial bergantung pada Anda."
          />
        )}
        {step === 4 && (
          <Choice
            label="Status utang"
            value={input.debtStatus}
            options={[
              ["none", "Tidak ada"],
              ["mandatory", "Cicilan wajib"],
              ["high_interest", "Utang berbunga tinggi"],
            ]}
            onChange={(v) => set("debtStatus", v as EmergencyFundInput["debtStatus"])}
            helper="Cicilan atau utang yang harus dibayar tiap bulan."
          />
        )}
        {step === 5 && (
          <MoneyField
            id="reserve"
            label="Dana likuid saat ini"
            value={input.currentLiquidReserve}
            onChange={(v) => set("currentLiquidReserve", v)}
            helper="Kas dan tabungan yang bisa dipakai segera. Jangan masukkan saham, kripto, atau saldo trading."
          />
        )}
        {step === 6 && (
          <MoneyField
            id="gold"
            label="Estimasi nilai buyback emas fisik"
            value={input.physicalGoldValue ?? 0}
            onChange={(v) => set("physicalGoldValue", v)}
            helper="Opsional. Emas tidak dihitung sebagai dana darurat inti."
          />
        )}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {step === steps.length - 1 && (
          <label className="mt-6 flex items-start gap-3 rounded-md border border-border p-4 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <strong>Persetujuan data.</strong> Data kebutuhan, utang, dan saldo dapat dilihat oleh
              Advisor yang ditugaskan dan Admin KBAI untuk keperluan layanan. Setiap akses dicatat.
            </span>
          </label>
        )}
        {result && step === steps.length - 1 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary" /> Preview: target {result.targetMonths} bulan ·
            Rp{result.targetFund.toLocaleString("id-ID")}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? navigate({ to: "/emergency-fund" }) : setStep(step - 1))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <Button onClick={next}>
          {step === steps.length - 1 ? (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" /> Lihat hasil
            </>
          ) : (
            <>
              Lanjut <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
function MoneyField({
  id,
  label,
  value,
  onChange,
  helper,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        type="number"
        min="0"
        step="1"
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
        className="mt-2 h-12 text-lg"
        placeholder="0"
      />
      <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
  helper: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-3 grid gap-2">
        {options.map(([option, text]) => (
          <label
            key={option}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-4 hover:bg-accent"
          >
            <input
              type="radio"
              name={label}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {text}
          </label>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{helper}</p>
    </fieldset>
  );
}
