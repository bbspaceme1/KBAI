import { callLovableAi } from "@/lib/ai-client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LovableAiToolResponse = {
  data?: { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[] };
  choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] }[] };
};

async function callAiTool<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
  model?: string;
}): Promise<T> {
  const json = await callLovableAi<LovableAiToolResponse>({
    model: opts.model ?? "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: opts.toolName,
          description: opts.description,
          parameters: opts.parameters,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: opts.toolName } },
  });

  const args =
    json.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI tidak mengembalikan output terstruktur.");
  return JSON.parse(args) as T;
}

type StockScreenerInput = {
  sectors: string[];
  risk: string;
  horizon_years: number;
  amount?: number;
};

export async function runStockScreener(data: StockScreenerInput) {
  await requireSupabaseAuth();

  const sectorClause =
    data.sectors.length > 0
      ? `Fokus sektor: ${data.sectors.join(", ")}.`
      : "Tanpa preferensi sektor.";
  const system = `Anda adalah Senior Equity Analyst yang menyaring saham IDX (Bursa Efek Indonesia). Pilih 10 saham IDX riil yang sesuai parameter, dengan rasionalisasi data fundamental (P/E, ROE, growth) berdasarkan pengetahuan terbaru Anda. Sertakan disclaimer bahwa angka adalah estimasi dan bukan rekomendasi investasi.`;
  const user = `Profil risiko: ${data.risk}. Horizon: ${data.horizon_years} tahun. Jumlah investasi: ${data.amount || "tidak ditentukan"}. ${sectorClause} Berikan 10 emiten terbaik di IDX.`;
  return callAiTool<{
    tickers: {
      ticker: string;
      name: string;
      sector: string;
      thesis: string;
      pe?: number;
      roe?: number;
      growth?: number;
      market_cap_idr?: number;
      risk_score: number;
    }[];
    summary: string;
  }>({
    system,
    user,
    toolName: "report_screener",
    description: "Return 10 IDX stocks matching the screener input.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Ringkasan strategi screening 2-3 kalimat." },
        tickers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ticker: { type: "string", description: "Kode IDX, contoh BBCA" },
              name: { type: "string" },
              sector: { type: "string" },
              thesis: { type: "string", description: "Alasan singkat 1-2 kalimat." },
              pe: { type: "number" },
              roe: { type: "number", description: "Return on equity dalam %" },
              growth: { type: "number", description: "Estimasi growth EPS YoY %" },
              market_cap_idr: { type: "number", description: "Market cap dalam triliun IDR" },
              risk_score: { type: "number", description: "1=rendah, 10=tinggi" },
            },
            required: ["ticker", "name", "sector", "thesis", "risk_score"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "tickers"],
      additionalProperties: false,
    },
  });
}

type DcfValuationInput = {
  ticker: string;
  company_name?: string;
};

export async function runDcfValuation(data: DcfValuationInput) {
  await requireSupabaseAuth();

  const system = `Anda adalah VP Investment Banking yang melakukan Discounted Cash Flow valuation untuk saham IDX. Gunakan WACC, terminal value, dan sensitivity matrix. Estimasi berdasarkan pengetahuan publik. Selalu sertakan asumsi dan disclaimer.`;
  const user = `Lakukan DCF untuk emiten IDX: ${data.ticker.toUpperCase()}${data.company_name ? ` (${data.company_name})` : ""}.`;
  return callAiTool<{
    ticker: string;
    company: string;
    current_price: number;
    intrinsic_value: number;
    verdict: "UNDERVALUED" | "FAIR" | "OVERVALUED";
    upside_pct: number;
    wacc: number;
    terminal_growth: number;
    fcf_projection: { year: number; fcf: number }[];
    assumptions: string[];
    sensitivity: { wacc: number; growth: number; value: number }[];
    narrative: string;
  }>({
    system,
    user,
    toolName: "report_dcf",
    description: "Return a structured DCF valuation report.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        company: { type: "string" },
        current_price: { type: "number", description: "Harga saham saat ini (IDR)" },
        intrinsic_value: { type: "number", description: "Fair value per saham (IDR)" },
        verdict: { type: "string", enum: ["UNDERVALUED", "FAIR", "OVERVALUED"] },
        upside_pct: { type: "number" },
        wacc: { type: "number", description: "WACC dalam %" },
        terminal_growth: { type: "number", description: "Terminal growth dalam %" },
        fcf_projection: {
          type: "array",
          items: {
            type: "object",
            properties: {
              year: { type: "number" },
              fcf: { type: "number", description: "Free cash flow proyeksi (miliar IDR)" },
            },
            required: ["year", "fcf"],
            additionalProperties: false,
          },
        },
        assumptions: { type: "array", items: { type: "string" } },
        sensitivity: {
          type: "array",
          description: "Matrix 9 cell: 3 WACC × 3 growth scenarios.",
          items: {
            type: "object",
            properties: {
              wacc: { type: "number" },
              growth: { type: "number" },
              value: { type: "number" },
            },
            required: ["wacc", "growth", "value"],
            additionalProperties: false,
          },
        },
        narrative: { type: "string", description: "Ringkasan tesis 3-5 kalimat." },
      },
      required: [
        "ticker",
        "company",
        "current_price",
        "intrinsic_value",
        "verdict",
        "upside_pct",
        "wacc",
        "terminal_growth",
        "fcf_projection",
        "assumptions",
        "sensitivity",
        "narrative",
      ],
      additionalProperties: false,
    },
  });
}

type EarningsBriefInput = {
  company: string;
  release_date?: string;
};

export async function runEarningsBrief(data: EarningsBriefInput) {
  await requireSupabaseAuth();

  const system = `Anda adalah Senior Equity Research Analyst yang menyusun pre-earnings brief untuk emiten IDX. Output ringkas, terstruktur, berbasis pengetahuan publik. Selalu sertakan disclaimer.`;
  const user = `Buat pre-earnings brief untuk: ${data.company}${data.release_date ? `. Rencana rilis: ${data.release_date}` : ""}.`;
  return callAiTool<{
    ticker: string;
    company: string;
    decision: "BELI" | "JUAL" | "TUNGGU";
    confidence: number;
    consensus_eps: number;
    consensus_revenue: number;
    implied_move_pct: number;
    beat_miss: { quarter: string; surprise_pct: number }[];
    segments: { name: string; weight_pct: number }[];
    bull_case: string;
    bear_case: string;
    narrative: string;
  }>({
    system,
    user,
    toolName: "report_earnings",
    description: "Pre-earnings brief structured report.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        company: { type: "string" },
        decision: { type: "string", enum: ["BELI", "JUAL", "TUNGGU"] },
        confidence: { type: "number", description: "0-100" },
        consensus_eps: { type: "number" },
        consensus_revenue: { type: "number", description: "Triliun IDR" },
        implied_move_pct: { type: "number" },
        beat_miss: {
          type: "array",
          description: "4 kuartal terakhir, surprise % (negatif=miss).",
          items: {
            type: "object",
            properties: {
              quarter: { type: "string" },
              surprise_pct: { type: "number" },
            },
            required: ["quarter", "surprise_pct"],
            additionalProperties: false,
          },
        },
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, weight_pct: { type: "number" } },
            required: ["name", "weight_pct"],
            additionalProperties: false,
          },
        },
        bull_case: { type: "string" },
        bear_case: { type: "string" },
        narrative: { type: "string" },
      },
      required: [
        "ticker",
        "company",
        "decision",
        "confidence",
        "consensus_eps",
        "consensus_revenue",
        "implied_move_pct",
        "beat_miss",
        "segments",
        "bull_case",
        "bear_case",
        "narrative",
      ],
      additionalProperties: false,
    },
  });
}

type PortfolioConstructionInput = {
  age: number;
  risk_score: number;
  annual_income?: string;
  total_assets?: string;
};

export async function runPortfolioConstruction(data: PortfolioConstructionInput) {
  await requireSupabaseAuth();

  const system = `Anda adalah Senior Portfolio Strategist. Bangun multi-asset allocation berbasis usia, toleransi risiko, dan kekayaan untuk investor IDX. Sertakan IPS (Investment Policy Statement) ringkas.`;
  const user = `Profil: usia ${data.age}, risiko ${data.risk_score}/10, pendapatan tahunan ${data.annual_income || "-"}, total aset ${data.total_assets || "-"}. Bangun portofolio.`;
  return callAiTool<{
    summary: string;
    allocation: { asset_class: string; weight_pct: number; rationale: string }[];
    core_satellite: {
      bucket: "Core" | "Satellite";
      ticker: string;
      weight_pct: number;
      thesis: string;
    }[];
    rebalancing: string;
    dca: string;
    max_drawdown_pct: number;
    ips: string;
  }>({
    system,
    user,
    toolName: "report_portfolio",
    description: "Portfolio construction report.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
        allocation: {
          type: "array",
          items: {
            type: "object",
            properties: {
              asset_class: { type: "string" },
              weight_pct: { type: "number" },
              rationale: { type: "string" },
            },
            required: ["asset_class", "weight_pct", "rationale"],
            additionalProperties: false,
          },
        },
        core_satellite: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bucket: { type: "string", enum: ["Core", "Satellite"] },
              ticker: { type: "string" },
              weight_pct: { type: "number" },
              thesis: { type: "string" },
            },
            required: ["bucket", "ticker", "weight_pct", "thesis"],
            additionalProperties: false,
          },
        },
        rebalancing: { type: "string" },
        dca: { type: "string" },
        max_drawdown_pct: { type: "number" },
        ips: { type: "string" },
      },
      required: [
        "summary",
        "allocation",
        "core_satellite",
        "rebalancing",
        "dca",
        "max_drawdown_pct",
        "ips",
      ],
      additionalProperties: false,
    },
  });
}

type TechnicalAnalysisInput = {
  ticker: string;
  position: string;
};

export async function runTechnicalAnalysis(data: TechnicalAnalysisInput) {
  await requireSupabaseAuth();

  const system = `Anda adalah Quantitative Trader untuk saham IDX. Lakukan multi-timeframe technical analysis berbasis pengetahuan publik harga historis. Sertakan trade plan + confidence.`;
  const user = `Analisis teknikal ${data.ticker.toUpperCase()}. Posisi user saat ini: ${data.position}.`;
  return callAiTool<{
    ticker: string;
    bias: "BULLISH" | "NEUTRAL" | "BEARISH";
    confidence: number;
    trend: { tf: "Daily" | "Weekly" | "Monthly"; direction: string; note: string }[];
    support: number[];
    resistance: number[];
    indicators: { name: string; value: string; signal: string }[];
    patterns: string[];
    trade_plan: {
      action: string;
      entry: number;
      stop_loss: number;
      take_profit: number;
      rr: number;
    };
    narrative: string;
  }>({
    system,
    user,
    toolName: "report_technical",
    description: "Technical analysis structured report.",
    parameters: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        bias: { type: "string", enum: ["BULLISH", "NEUTRAL", "BEARISH"] },
        confidence: { type: "number" },
        trend: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tf: { type: "string", enum: ["Daily", "Weekly", "Monthly"] },
              direction: { type: "string" },
              note: { type: "string" },
            },
            required: ["tf", "direction", "note"],
            additionalProperties: false,
          },
        },
        support: { type: "array", items: { type: "number" } },
        resistance: { type: "array", items: { type: "number" } },
        indicators: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              value: { type: "string" },
              signal: { type: "string" },
            },
            required: ["name", "value", "signal"],
            additionalProperties: false,
          },
        },
        patterns: { type: "array", items: { type: "string" } },
        trade_plan: {
          type: "object",
          properties: {
            action: { type: "string" },
            entry: { type: "number" },
            stop_loss: { type: "number" },
            take_profit: { type: "number" },
            rr: { type: "number" },
          },
          required: ["action", "entry", "stop_loss", "take_profit", "rr"],
          additionalProperties: false,
        },
        narrative: { type: "string" },
      },
      required: [
        "ticker",
        "bias",
        "confidence",
        "trend",
        "support",
        "resistance",
        "indicators",
        "patterns",
        "trade_plan",
        "narrative",
      ],
      additionalProperties: false,
    },
  });
}

type DividendStrategyInput = {
  total_investment?: string;
  monthly_target?: string;
  tax_status: string;
};

export async function runDividendStrategy(data: DividendStrategyInput) {
  await requireSupabaseAuth();

  const system = `Anda adalah Chief Investment Strategist untuk dividend portfolio IDX. Pilih 12-15 saham dividen, sertakan safety score & DRIP compounding 5 tahun. Berbasis pengetahuan publik.`;
  const user = `Total investasi: ${data.total_investment || "-"}. Target bulanan: ${data.monthly_target || "-"}. Pajak: ${data.tax_status}.`;
  return callAiTool<{
    summary: string;
    portfolio: {
      ticker: string;
      name: string;
      yield_pct: number;
      payout_ratio_pct: number;
      safety_score: number;
      weight_pct: number;
    }[];
    monthly_income_idr: number;
    effective_yield_pct: number;
    drip_5y_value_idr: number;
    sector_mix: { sector: string; weight_pct: number }[];
  }>({
    system,
    user,
    toolName: "report_dividend",
    description: "Dividend strategy structured report.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
        portfolio: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ticker: { type: "string" },
              name: { type: "string" },
              yield_pct: { type: "number" },
              payout_ratio_pct: { type: "number" },
              safety_score: { type: "number", description: "1-10" },
              weight_pct: { type: "number" },
            },
            required: [
              "ticker",
              "name",
              "yield_pct",
              "payout_ratio_pct",
              "safety_score",
              "weight_pct",
            ],
            additionalProperties: false,
          },
        },
        monthly_income_idr: { type: "number" },
        effective_yield_pct: { type: "number" },
        drip_5y_value_idr: { type: "number" },
        sector_mix: {
          type: "array",
          items: {
            type: "object",
            properties: { sector: { type: "string" }, weight_pct: { type: "number" } },
            required: ["sector", "weight_pct"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "summary",
        "portfolio",
        "monthly_income_idr",
        "effective_yield_pct",
        "drip_5y_value_idr",
        "sector_mix",
      ],
      additionalProperties: false,
    },
  });
}
