import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const GLOSSARY: Record<string, string> = {
  WACC: "Weighted Average Cost of Capital — biaya modal rata-rata tertimbang. Discount rate untuk DCF.",
  DCF: "Discounted Cash Flow — valuasi arus kas masa depan didiskonto ke nilai sekarang.",
  PE: "Price-to-Earnings ratio — harga saham per laba bersih per saham. Indikator valuasi relatif.",
  PBV: "Price-to-Book Value — harga saham per nilai buku ekuitas per saham.",
  ROE: "Return on Equity — laba bersih per ekuitas. Mengukur efisiensi modal pemegang saham.",
  ROA: "Return on Assets — laba bersih per total aset. Efisiensi penggunaan aset.",
  Sharpe: "Sharpe Ratio — return berlebih per unit risiko. Makin tinggi makin baik (>1 bagus).",
  NPL: "Non-Performing Loan — rasio kredit bermasalah terhadap total kredit bank.",
  CAR: "Capital Adequacy Ratio — rasio kecukupan modal bank. Minimum BI: 8%.",
  CASA: "Current Account Saving Account — proporsi giro & tabungan terhadap total DPK.",
  KBAI: "Komunitas Beli Aset Indonesia — indeks tertimbang dari portfolio anggota komunitas.",
  IHSG: "Indeks Harga Saham Gabungan — benchmark utama Bursa Efek Indonesia.",
  EOD: "End of Day — harga penutupan pasar. Data delayed, bukan realtime.",
  FCF: "Free Cash Flow — arus kas operasi dikurangi capex. Kas tersedia untuk pemegang saham.",
  PMI: "Purchasing Managers Index — indeks aktivitas manufaktur. >50 ekspansi, <50 kontraksi.",
  CPI: "Consumer Price Index — indeks harga konsumen. Basis perhitungan inflasi.",
  GDP: "Gross Domestic Product — total output ekonomi suatu negara.",
  DXY: "US Dollar Index — kekuatan USD terhadap basket 6 mata uang utama.",
};

export function MetricTooltip({
  term,
  description,
  className,
}: {
  term: string;
  description?: string;
  className?: string;
}) {
  const text = description ?? GLOSSARY[term.toUpperCase()] ?? `Definisi ${term} belum tersedia.`;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Apa itu ${term}?`}
            className={cn(
              "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
              className,
            )}
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-caption">
          <div className="font-semibold">{term}</div>
          <div className="mt-1 text-muted-foreground">{text}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
