/**
 * IDX Data Operations Library
 * Provides utilities for fetching and manipulating IDX stock data
 * Part of BB Space × IDX Platform Integration
 */

export interface IDXStock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  per?: number;
  pbv?: number;
  roe?: number;
  dividendYield?: number;
  marketCap?: number;
}

export interface IDXScreenerFilters {
  sector?: string;
  board?: string;
  min_per?: number;
  max_per?: number;
  min_pbv?: number;
  max_pbv?: number;
  min_roe?: number;
  min_div_yield?: number;
  max_der?: number;
  min_market_cap?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
}

export interface IDXStockCompany {
  name: string;
  industry?: string;
  description?: string;
  website?: string;
  [key: string]: unknown;
}

export interface IDXStockRatios {
  per?: number;
  pbv?: number;
  roe?: number;
  dividendYield?: number;
  debtEquity?: number;
  [key: string]: unknown;
}

export interface IDXStockTechnical {
  signals?: string[];
  ma20?: number;
  ma50?: number;
  rsi?: number;
  [key: string]: unknown;
}

export interface IDXStockDetail {
  ticker: string;
  company: IDXStockCompany;
  prices: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  ratios: IDXStockRatios;
  technical: IDXStockTechnical;
  meta: {
    period: string;
    total_days: number;
    start_date: string;
    last_update: string;
  };
}

export interface IDXMarketOverview {
  timestamp: string;
  indices: Array<{
    index_code: string;
    date: string;
    close: number;
    change: number;
    change_pct: number;
  }>;
  gainers: IDXStock[];
  losers: IDXStock[];
  mostActive: IDXStock[];
  sectors: Array<{
    sector: string;
    count: number;
    marketCap: number;
    avgPer: number;
    avgRoe: number;
    avgChange: number;
  }>;
  summary: {
    totalIndices: number;
    gainersCount: number;
    losersCount: number;
    activeTickers: number;
    totalSectors: number;
  };
}

/**
 * Fetch stock details including prices, ratios, and technical indicators
 */
export async function fetchIDXStockDetail(
  ticker: string,
  period: string = "1y",
): Promise<IDXStockDetail | null> {
  try {
    const response = await fetch(`/api/idx/stocks/${ticker}?period=${period}`);
    if (!response.ok) throw new Error("Failed to fetch stock detail");
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch market overview (indices, gainers, losers, sectors)
 */
export async function fetchIDXMarketOverview(): Promise<IDXMarketOverview | null> {
  try {
    const response = await fetch("/api/idx/market/overview");
    if (!response.ok) throw new Error("Failed to fetch market overview");
    return await response.json();
  } catch (error) {
    console.error("Error fetching market overview:", error);
    return null;
  }
}

/**
 * Screener: fetch stocks with filters
 */
export async function fetchIDXScreener(
  filters: IDXScreenerFilters,
): Promise<{ data: IDXStock[]; count: number } | null> {
  try {
    const params = new URLSearchParams();

    // Build query params
    if (filters.sector) params.set("sector", filters.sector);
    if (filters.board) params.set("board", filters.board);
    if (filters.min_per !== undefined) params.set("min_per", String(filters.min_per));
    if (filters.max_per !== undefined) params.set("max_per", String(filters.max_per));
    if (filters.min_pbv !== undefined) params.set("min_pbv", String(filters.min_pbv));
    if (filters.max_pbv !== undefined) params.set("max_pbv", String(filters.max_pbv));
    if (filters.min_roe !== undefined) params.set("min_roe", String(filters.min_roe));
    if (filters.min_div_yield !== undefined)
      params.set("min_div_yield", String(filters.min_div_yield));
    if (filters.max_der !== undefined) params.set("max_der", String(filters.max_der));
    if (filters.min_market_cap !== undefined)
      params.set("min_market_cap", String(filters.min_market_cap));
    if (filters.sort_by) params.set("sort_by", filters.sort_by);
    if (filters.sort_order) params.set("sort_order", filters.sort_order);
    if (filters.limit) params.set("limit", String(filters.limit));

    const response = await fetch(`/api/idx/screener?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch screener data");

    return await response.json();
  } catch (error) {
    console.error("Error fetching screener:", error);
    return null;
  }
}

/**
 * Format Indonesian Rupiah currency
 */
export function formatIDR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format market cap (T for trillion, B for billion, M for million)
 */
export function formatMarketCap(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";

  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toString();
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * Format ratio (PER, PBV, ROE, etc.)
 */
export function formatRatio(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(decimals);
}

/**
 * Determine color based on change value
 */
export function getChangeColor(change: number | null | undefined): string {
  if (change === null || change === undefined) return "text-gray-400";
  if (change > 0) return "text-green-500";
  if (change < 0) return "text-red-500";
  return "text-gray-400";
}

/**
 * Get sectors list
 */
export const IDX_SECTORS = [
  "Keuangan",
  "Energi",
  "Infrastruktur",
  "Transportasi & Logistik",
  "Teknologi",
  "Konsumen Non-Primer",
  "Konsumen Primer",
  "Kesehatan",
  "Industri",
  "Properti & Real Estat",
  "Bahan Baku",
];

/**
 * Get boards list
 */
export const IDX_BOARDS = ["Utama", "Pengembangan", "Akselerasi"];

/**
 * Screener presets
 */
export const SCREENER_PRESETS = {
  "Value Stocks": {
    max_per: 15,
    min_pbv: 0.5,
    max_pbv: 2,
    min_roe: 0.1,
  },
  "Growth Stocks": {
    max_per: 25,
    min_roe: 0.15,
  },
  "Dividend Picks": {
    min_div_yield: 0.03,
    max_per: 20,
    min_roe: 0.1,
  },
  "Blue Chips": {
    min_market_cap: 100e12, // > 100T
  },
  "Small Caps": {
    min_market_cap: 100e9, // > 100B
    max_market_cap: 1e12, // < 1T
  },
};
