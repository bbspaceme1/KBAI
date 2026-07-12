interface MarketDataProvider {
  fetchQuotes(symbols: string[]): Promise<Record<string, number>>;
  fetchChart(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<Array<{ date: string; close: number }>>;
}

class YahooFinanceProvider implements MarketDataProvider {
  private headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    Accept: "application/json",
  };

  async fetchQuotes(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      symbols.join(","),
    )}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Yahoo quote error: ${res.status}`);
    const json = (await res.json()) as {
      quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice?: number }> };
    };
    const out: Record<string, number> = {};
    for (const q of json.quoteResponse?.result ?? []) {
      if (typeof q.regularMarketPrice === "number") out[q.symbol] = q.regularMarketPrice;
    }
    return out;
  }

  async fetchChart(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<Array<{ date: string; close: number }>> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?period1=${fromUnix}&period2=${toUnix}&interval=1d`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>;
      };
    };
    const r = json.chart?.result?.[0];
    const ts = r?.timestamp ?? [];
    const cl = r?.indicators?.quote?.[0]?.close ?? [];
    const out: Array<{ date: string; close: number }> = [];
    for (let i = 0; i < ts.length; i++) {
      const c = cl[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        out.push({
          date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
          close: c,
        });
      }
    }
    return out;
  }
}

class SectorsFinanceProvider implements MarketDataProvider {
  constructor(private apiKey?: string) {}

  async fetchQuotes(symbols: string[]): Promise<Record<string, number>> {
    // Placeholder for Sectors API integration. If a dedicated MARKET_DATA_API
    // is configured, the OfficialMarketDataProvider below will be used instead.
    throw new Error("Sectors API integration not implemented");
  }

  async fetchChart(
    symbol: string,
    fromUnix: number,
    toUnix: number,
  ): Promise<Array<{ date: string; close: number }>> {
    throw new Error("Sectors API integration not implemented");
  }
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
      } catch (error) {
        console.warn(`Market data provider failed: ${error}`);
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
      } catch (error) {
        console.warn(`Market data provider failed: ${error}`);
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

  // Next: Sectors API (if configured)
  if (process.env.SECTORS_API_KEY) {
    providers.push(new SectorsFinanceProvider(process.env.SECTORS_API_KEY));
  }

  // Fallback: Yahoo Finance provider (kept as last resort)
  providers.push(new YahooFinanceProvider());

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
  return {
    price,
    previousClose: price,
    pctChange: 0,
    currency: "USD",
  };
}
