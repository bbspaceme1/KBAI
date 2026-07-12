/**
 * AI Response Wrapper with Financial Disclaimers
 *
 * Ensures all AI-generated financial content includes proper disclaimers
 * to protect users and KBAI Terminal from liability.
 */

export const FINANCIAL_DISCLAIMER = `
⚠️ **Disclaimer Penting:**
Konten di bawah ini dihasilkan oleh AI berdasarkan data historis dan analisis. 
**BUKAN merupakan saran investasi profesional atau rekomendasi untuk membeli/menjual.**

Selalu lakukan riset mandiri dan konsultasikan dengan advisor keuangan berlisensi sebelum membuat keputusan investasi.
KBAI Terminal dan pengguna bertanggung jawab penuh atas keputusan finansial mereka.

**Risiko Pasar:** Semua investasi saham memiliki risiko kehilangan modal. Performa masa lalu bukan jaminan hasil masa depan.
`.trim();

export interface AiFinancialResponse<T> {
  content: T;
  disclaimer: string;
  confidence: "low" | "medium" | "high";
  dataFreshness: string;
  generatedAt: string;
  modelUsed: string;
}

/**
 * Wrap AI response with disclaimer and metadata
 */
export function withFinancialDisclaimer<T>(
  content: T,
  options: {
    confidence?: "low" | "medium" | "high";
    model?: string;
    dataFreshness?: string;
  } = {},
): AiFinancialResponse<T> {
  return {
    content,
    disclaimer: FINANCIAL_DISCLAIMER,
    confidence: options.confidence || "medium",
    dataFreshness: options.dataFreshness || "Data per " + new Date().toLocaleDateString("id-ID"),
    generatedAt: new Date().toISOString(),
    modelUsed: options.model || "unknown",
  };
}

/**
 * Render HTML disclaimer for UI display
 */
export function renderDisclaimerHtml(): string {
  return `
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-yellow-800">
            Konten ini dihasilkan oleh AI dan BUKAN saran investasi profesional.
          </p>
          <p class="mt-2 text-sm text-yellow-700">
            Selalu lakukan riset mandiri dan konsultasikan dengan advisor keuangan berlisensi sebelum membuat keputusan investasi.
          </p>
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Markdown format disclaimer for export/print
 */
export function formatDisclaimerMarkdown(): string {
  return `
## ⚠️ Disclaimer Penting

Konten ini dihasilkan oleh AI berdasarkan data historis dan analisis. 
**BUKAN merupakan saran investasi profesional atau rekomendasi untuk membeli/menjual.**

Selalu lakukan riset mandiri dan konsultasikan dengan advisor keuangan berlisensi sebelum membuat keputusan investasi.
KBAI Terminal tidak bertanggung jawab atas keputusan finansial yang diambil berdasarkan konten ini.

### Risiko Pasar
Semua investasi saham memiliki risiko kehilangan modal. Performa masa lalu bukan jaminan hasil masa depan.
`.trim();
}
