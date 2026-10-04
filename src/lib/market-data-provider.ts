interface MarketDataProvider {
  fetchQuotes(symbols: string[]): Promise<Record<string, number>>;
  fetchChart(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<Array<{ date: string; close: number }>>;
}

/**
 * OfficialMarketDataProvider - generic adapter for an official market-data API.
 *
 * Expects two env vars:
 * - MARKET_DATA_API_URL (base URL, e.g. https://api.marketdata.example)
 * - MARKET_DATA_API_KEY (API key passed as Authorization: Bearer <key>)
 *
 * The adapter attempts two endpoints:
 * - `${base}/quotes?symbols=a,b,c`
 * - `${base}/chart/{symbol}?from={from}&to={to}`
 *
 * Implementations may return different shapes; the adapter handles common shapes.
 */
class OfficialMarketDataProvider implements MarketDataProvider {
  constructor(
    private baseUrl: string,
    private apiKey?: string,
  ) {}

  private headers() {
    const h: Record<string, string> = { Accept: "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  async fetchQuotes(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    const url = `${this.baseUrl.replace(/\/$/, "")}/quotes?symbols=${encodeURIComponent(
      symbols.join(","),
    )}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Official provider quote error: ${res.status}`);
    const json = await res.json();
    // Flexible parsing: prefer { data: { SYMBOL: price } } or array of { symbol, price }
    const out: Record<string, number> = {};
    if (json?.data && typeof json.data === "object") {
      for (const k of Object.keys(json.data)) {
        const v = json.data[k];
        if (typeof v === "number") out[k] = v;
        else if (v && typeof v === "object" && typeof v.price === "number") out[k] = v.price;
      }
      return out;
    }
    if (Array.isArray(json)) {
      for (const item of json) {
        if (item && item.symbol && typeof item.price === "number") out[item.symbol] = item.price;
      }
      return out;
    }
    throw new Error("Unexpected official provider response shape");
  }

  async fetchChart(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<Array<{ date: string; close: number }>> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/chart/${encodeURIComponent(symbol)}?from=${fromUnix}&to=${toUnix}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`Official provider chart error: ${res.status}`);
    const json = await res.json();
    // Accept either { data: [{ date, close }, ...] } or { timestamps: [], closes: [] }
    if (json?.data && Array.isArray(json.data)) {
      type ChartRow = { date?: string | number; close?: number | string };
      return (json.data as ChartRow[]).map((r) => ({
        date: String(r.date),
        close: Number(r.close),
      }));
    }
    if (json?.timestamps && Array.isArray(json.timestamps) && Array.isArray(json.closes)) {
      const out: Array<{ date: string; close: number }> = [];
      for (let i = 0; i < json.timestamps.length; i++) {
        const t = json.timestamps[i];
        const c = json.closes[i];
        if (c != null)
          out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: Number(c) });
      }
      return out;
    }
    throw new Error("Unexpected official provider chart shape");
  }
}

class MarketDataProviderChain implements MarketDataProvider {
  constructor(private providers: MarketDataProvider[]) {}

  async fetchQuotes(symbols: string[]): Promise<Record<string, number>> {
    for (const provider of this.providers) {
      try {
        return await provider.fetchQuotes(symbols);
      } catch {
        console.warn("Market data provider request failed; trying fallback.");
        continue;
      }
    }
    throw new Error("All market data providers failed");
  }

  async fetchChart(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<Array<{ date: string; close: number }>> {
    for (const provider of this.providers) {
      try {
        return await provider.fetchChart(symbol, fromUnix, toUnix);
      } catch {
        console.warn("Market data provider request failed; trying fallback.");
        continue;
      }
    }
    throw new Error("All market data providers failed");
  }
}

export function createMarketDataProvider(): MarketDataProvider {
  const providers: MarketDataProvider[] = [];

  // Primary: Official Market Data Provider (if configured)
  const apiUrl = process.env.MARKET_DATA_API_URL;
  const apiKey = process.env.MARKET_DATA_API_KEY || process.env.SECTORS_API_KEY;
  if (apiUrl) {
    providers.push(new OfficialMarketDataProvider(apiUrl, apiKey));
  }

  if (providers.length === 0) {
    throw new Error("No official market data provider configured");
  }

  return new MarketDataProviderChain(providers);
}

export async function fetchMarketQuotes(symbols: string[]): Promise<Record<string, number>> {
  return createMarketDataProvider().fetchQuotes(symbols);
}

export async function fetchMarketChart(
  symbol: string,
  fromUnix: number,
  toUnix: number,
): Promise<Array<{ date: string; close: number }>> {
  return createMarketDataProvider().fetchChart(symbol, fromUnix, toUnix);
}

export async function fetchMarketQuoteDetail(
  symbol: string,
): Promise<{ price: number; previousClose: number; pctChange: number; currency: string } | null> {
  const quotes = await fetchMarketQuotes([symbol]);
  const price = quotes[symbol];
  if (price == null) return null;

  const now = Math.floor(Date.now() / 1000);
  const chart = await fetchMarketChart(symbol, now - 14 * 24 * 60 * 60, now);
  const today = new Date().toISOString().slice(0, 10);
  const previousClose = [...chart].reverse().find((point) => point.date < today)?.close ?? price;
  const pctChange = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
  const isIdxTicker = /^[A-Z]{4}$/.test(symbol.replace(/^IDX:/, ""));

  return {
    price,
    previousClose,
    pctChange,
    currency: isIdxTicker ? "IDR" : "USD",
  };
}
