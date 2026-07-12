import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export interface PortfolioPdfData {
  username: string;
  asOf: Date;
  cash: number;
  totalValue: number;
  totalCost: number;
  positions: Array<{
    ticker: string;
    lot: number;
    avg: number;
    last: number;
    value: number;
    pl: number;
    plPct: number;
  }>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));

export function exportPortfolioPdf(d: PortfolioPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("KBAI Terminal — Portfolio Snapshot", margin, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`@${d.username}`, margin, 66);
  doc.text(
    `Per ${format(d.asOf, "dd MMMM yyyy HH:mm", { locale: idLocale })} WIB`,
    pageW - margin,
    66,
    { align: "right" },
  );

  // Summary box
  const totalEquity = d.totalValue + d.cash;
  const totalPL = d.totalValue - d.totalCost;
  const totalPLPct = d.totalCost > 0 ? (totalPL / d.totalCost) * 100 : 0;

  doc.setDrawColor(220);
  doc.line(margin, 80, pageW - margin, 80);

  doc.setTextColor(0);
  doc.setFontSize(8);
  const stats = [
    ["Total Equity", `Rp ${fmt(totalEquity)}`],
    ["Market Value", `Rp ${fmt(d.totalValue)}`],
    ["Cash", `Rp ${fmt(d.cash)}`],
    ["Unrealized P/L", `${totalPL >= 0 ? "+" : ""}Rp ${fmt(totalPL)} (${totalPLPct.toFixed(2)}%)`],
  ];
  const y = 100;
  stats.forEach(([k, v], i) => {
    const x = margin + (i % 2) * ((pageW - margin * 2) / 2);
    doc.setTextColor(120);
    doc.text(k, x, y + Math.floor(i / 2) * 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(v, x, y + Math.floor(i / 2) * 22 + 12);
    doc.setFont("helvetica", "normal");
  });

  // Positions table
  autoTable(doc, {
    startY: 160,
    head: [["Ticker", "Lot", "Avg", "Last", "Value", "P/L", "%"]],
    body: d.positions.map((p) => [
      p.ticker,
      String(p.lot),
      fmt(p.avg),
      fmt(p.last),
      `Rp ${fmt(p.value)}`,
      `${p.pl >= 0 ? "+" : ""}${fmt(p.pl)}`,
      `${p.plPct >= 0 ? "+" : ""}${p.plPct.toFixed(2)}%`,
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 8 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });

  // Footer disclaimer
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200;
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    "Disclaimer: Snapshot ini bukan rekomendasi investasi. Data harga EOD dari sumber publik. KBAI Terminal tidak bertanggung jawab atas keputusan investasi Anda.",
    margin,
    Math.min(finalY + 30, doc.internal.pageSize.getHeight() - 30),
    { maxWidth: pageW - margin * 2 },
  );

  doc.save(`kbai-portfolio-${d.username}-${format(d.asOf, "yyyyMMdd-HHmm")}.pdf`);
}
