import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { fmtIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adjustCash } from "@/lib/portfolio.functions";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface CashManagementDialogProps {
  open: boolean;
  onClose: () => void;
  cashBalance: number;
  onSuccess: () => void;
}

export function CashManagementDialog({
  open,
  onClose,
  cashBalance,
  onSuccess,
}: CashManagementDialogProps) {
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd", { locale: idLocale }));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setAmount("");
    setNote("");
    setDate(format(new Date(), "yyyy-MM-dd", { locale: idLocale }));
  };

  const close = () => {
    reset();
    onClose();
  };

  const parseIDR = (value: string): number => {
    const cleaned = value.replace(/[^0-9]/g, "");
    const parsed = parseInt(cleaned, 10);
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  const amtN = parseIDR(amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amtN <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    if (type === "WITHDRAW" && amtN > cashBalance) {
      toast.error(`Saldo tidak cukup. Saldo: ${fmtIDR(cashBalance)}`);
      return;
    }
    setSubmitting(true);
    try {
      await adjustCash({
        movement_type: type,
        amount: amtN,
        occurred_at: date,
        note: note.trim() || undefined,
      });
      toast.success(`${type === "DEPOSIT" ? "Top up" : "Withdraw"} ${fmtIDR(amtN)} berhasil`);
      onSuccess();
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            Cash Movement
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-sm border border-dashed border-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          Saldo saat ini ·{" "}
          <span className="font-mono text-[13px] font-semibold tabular text-foreground">
            {fmtIDR(cashBalance)}
          </span>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-border">
          {(["DEPOSIT", "WITHDRAW"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                type === t
                  ? t === "DEPOSIT"
                    ? "bg-pos/15 text-pos"
                    : "bg-neg/15 text-neg"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {t === "DEPOSIT" ? "Top Up" : "Withdraw"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Amount (IDR)">
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="h-9 rounded-sm border-border bg-background font-mono text-[13px] tabular"
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-9 rounded-sm border-border bg-background text-[13px]"
            />
          </Field>
          <Field label="Note (optional)">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={255}
              className="h-9 rounded-sm border-border bg-background text-[13px]"
            />
          </Field>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={close}
              className="h-8 rounded-sm border-border text-[12px] uppercase tracking-[0.12em]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="h-8 rounded-sm bg-foreground px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-background hover:bg-foreground/90"
            >
              {submitting ? "Saving…" : `Confirm ${type === "DEPOSIT" ? "Top Up" : "Withdraw"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
