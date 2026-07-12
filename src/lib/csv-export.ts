// Tiny CSV export util — RFC 4180 escaping
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return "";
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[])).map(String);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(",");
  const body = rows
    .map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportRowsCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: (keyof T)[],
) {
  downloadCsv(filename, toCsv(rows, columns));
}
