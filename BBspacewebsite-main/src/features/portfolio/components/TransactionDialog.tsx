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
import { IDX_EMITEN } from "@/lib/idx-tickers";
import { submitTransaction } from "@/lib/portfolio.functions";
import { toast } from "sonner";

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  side: "BUY" | "SELL";
  userId: string;
  holdings: Array<{ ticker: string; total_lot: number; avg_price: number }>;
  onSuccess: () => void;
}

export function TransactionDialog({
  open,
  onClose,
  side: initialSide,
  userId,
  holdings,
  onSuccess,
}: TransactionDialogProps) {
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [ticker, setTicker] = useState("");
  const [lot, setLot] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const tickerUpper = ticker.toUpperCase();
  const matchedEmiten = IDX_EMITEN.find((e) => e.code === tickerUpper);
  const ownedLot = holdings.find((h) => h.ticker === tickerUpper)?.total_lot ?? 0;
  const lotN = parseInt(lot, 10) || 0;
  const priceN = parseFloat(price) || 0;
  const notional = lotN * priceN * 100;

  const reset = () => {
    setTicker("");
    setLot("");
    setPrice("");
    setDate(new Date().toISOString().slice(0, 10));
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerUpper || !matchedEmiten) {
      toast.error("Ticker tidak valid");
      return;
    }
    if (lotN <= 0 || priceN <= 0) {
      toast.error("Lot dan price harus > 0");
      return;
    }
    if (side === "SELL" && lotN > ownedLot) {
      toast.error(`Tidak cukup lot. Owned: ${ownedLot}`);
      return;
    }

    setSubmitting(true);
    try {
      await submitTransaction({
        ticker: tickerUpper,
        side,
        lot: lotN,
        price: priceN,
        transacted_at: date,
      });
      toast.success(`${side} ${tickerUpper} berhasil dicatat`);
      onSuccess();
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[13px] font-semibold uppercase tracking-[0.14em]">
            New Transaction
          </DialogTitle>
        </DialogHeader>

        {/* BUY/SELL pill toggle */}
        <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-border">
          {(["BUY", "SELL"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                side === s
                  ? s === "BUY"
                    ? "bg-pos/15 text-pos"
                    : "bg-neg/15 text-neg"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Ticker">
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="BBCA"
              maxLength={10}
              required
              list="idx-tickers-datalist"
              className="h-9 rounded-sm border-border bg-background font-mono text-[13px] tracking-wider"
            />
            <datalist id="idx-tickers-datalist">
              {IDX_EMITEN.slice(0, 200).map((e) => (
                <option key={e.code} value={e.code}>
                  {e.name}
                </option>
              ))}
            </datalist>
            {tickerUpper.length >= 2 && (
              <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                {matchedEmiten ? matchedEmiten.name : "✗ Tidak dikenali"}
                {side === "SELL" && matchedEmiten && (
                  <span className="ml-2 text-foreground/70">· Owned: {ownedLot} lot</span>
                )}
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lot">
              <Input
                type="number"
                min="1"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                required
                className="h-9 rounded-sm border-border bg-background font-mono text-[13px] tabular"
              />
            </Field>
            <Field label="Price / share">
              <Input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="h-9 rounded-sm border-border bg-background font-mono text-[13px] tabular"
              />
            </Field>
          </div>
          <Field label="Trade date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-9 rounded-sm border-border bg-background text-[13px]"
            />
          </Field>

          <div className="flex items-center justify-between rounded-sm border border-dashed border-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <span>Notional</span>
            <span className="font-mono text-[13px] font-semibold tabular text-foreground">
              {fmtIDR(notional)}
            </span>
          </div>

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
              className={cn(
                "h-8 rounded-sm px-4 text-[12px] font-semibold uppercase tracking-[0.12em]",
                side === "BUY"
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              {submitting ? "Saving…" : `Confirm ${side}`}
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
