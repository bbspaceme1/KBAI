export const fmtIDR = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n);

export const fmtNum = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(n);

export const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
