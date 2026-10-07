export const IDX_API_BASE = "https://www.idx.co.id/primary";

export type IdxEnvelope<T> = {
  draw?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  data?: T[];
};

export interface IdxStockSummary {
  StockCode: string;
  StockName: string;
  Date: string;
  Previous: number | null;
  OpenPrice: number | null;
  FirstTrade: number | null;
  High: number | null;
  Low: number | null;
  Close: number | null;
  Change: number | null;
  Volume: number | null;
  Value: number | null;
  Frequency: number | null;
  Offer: number | null;
  OfferVolume: number | null;
  Bid: number | null;
  BidVolume: number | null;
  ListedShares: number | null;
  TradebleShares: number | null;
  WeightForIndex: number | null;
  ForeignSell: number | null;
  ForeignBuy: number | null;
  NonRegularVolume: number | null;
  NonRegularValue: number | null;
  NonRegularFrequency: number | null;
  [key: string]: unknown;
}

export interface IdxBrokerSummary {
  IDFirm: string;
  FirmName: string;
  Date: string;
  Volume: number | null;
  Value: number | null;
  Frequency: number | null;
  [key: string]: unknown;
}

export interface IdxIndexSummary {
  IndexCode: string;
  IndexName: string;
  Date: string;
  Previous: number | null;
  Highest: number | null;
  Lowest: number | null;
  Close: number | null;
  Change: number | null;
  Volume: number | null;
  Value: number | null;
  Frequency: number | null;
  MarketCapital: number | null;
  NumberOfStock: number | null;
  [key: string]: unknown;
}

export interface IdxCompanyProfile {
  KodeEmiten: string;
  NamaEmiten: string;
  Sektor: string;
  SubSektor: string;
  Industri?: string;
  SubIndustri?: string;
  PapanPencatatan?: string;
  [key: string]: unknown;
}

export interface IdxCorporateAction {
  id: number | string;
  KodeEmiten: string;
  TanggalPencatatan: string;
  JenisTindakan: string;
  JumlahSaham: number | null;
  JumlahSahamSetelahTindakan: number | null;
  [key: string]: unknown;
}

export interface IdxAnnouncement {
  Id: string;
  AnnouncementNo?: string;
  PublishDate: string;
  Title: string;
  Code?: string;
  Jenis?: string;
  Attachments?: Array<{ FullSavePath?: string; OriginalFilename?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface IdxDerivedStockMetrics {
  return: number | null;
  vwap: number | null;
  netForeignFlow: number | null;
  marketCap: number | null;
}

const endpointMap = {
  stockSummary: "/TradingSummary/GetStockSummary",
  brokerSummary: "/TradingSummary/GetBrokerSummary",
  indexSummary: "/TradingSummary/GetIndexSummary",
  companyProfiles: "/ListedCompany/GetCompanyProfiles",
  companyDetail: "/ListedCompany/GetCompanyProfilesDetail",
  corporateActions: "/ListingActivity/GetIssuedHistory",
  announcements: "/NewsAnnouncement/GetAllAnnouncement",
} as const;

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function deriveStockMetrics(
  row: Pick<
    IdxStockSummary,
    "Previous" | "Close" | "Volume" | "Value" | "ForeignBuy" | "ForeignSell" | "ListedShares"
  >,
): IdxDerivedStockMetrics {
  const previous = numeric(row.Previous);
  const close = numeric(row.Close);
  const volume = numeric(row.Volume);
  const value = numeric(row.Value);
  return {
    return: previous && close != null ? (close - previous) / previous : null,
    vwap: volume && value != null ? value / volume : null,
    netForeignFlow:
      numeric(row.ForeignBuy) != null && numeric(row.ForeignSell) != null
        ? numeric(row.ForeignBuy)! - numeric(row.ForeignSell)!
        : null,
    marketCap:
      close != null && numeric(row.ListedShares) != null
        ? close * numeric(row.ListedShares)!
        : null,
  };
}

export function buildIdxUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${IDX_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) url.searchParams.set(key, String(value));
  return url.toString();
}

export async function fetchIdxDataset<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  fetcher: typeof fetch = fetch,
): Promise<IdxEnvelope<T>> {
  const response = await fetcher(buildIdxUrl(path, params), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`IDX request failed: ${response.status}`);
  const payload = (await response.json()) as IdxEnvelope<T>;
  if (!Array.isArray(payload.data)) throw new Error("IDX response did not contain a data array");
  return payload;
}

export async function fetchIdxPaginated<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  fetcher: typeof fetch = fetch,
  pageSize = 500,
): Promise<IdxEnvelope<T>> {
  const rows: T[] = [];
  let start = 0;
  let expected: number | undefined;
  while (true) {
    const page = await fetchIdxDataset<T>(path, { ...params, start, length: pageSize }, fetcher);
    const pageRows = page.data ?? [];
    rows.push(...pageRows);
    expected = page.recordsFiltered ?? page.recordsTotal ?? expected;
    const completeByCount = expected !== undefined && rows.length >= expected;
    if (completeByCount || pageRows.length < pageSize) {
      return {
        ...page,
        data: rows,
        recordsFiltered: expected ?? rows.length,
        recordsTotal: page.recordsTotal ?? expected ?? rows.length,
      };
    }
    start += pageRows.length;
    if (pageRows.length === 0) throw new Error(`IDX pagination stalled for ${path}`);
  }
}

export const idxEndpoints = endpointMap;

export async function fetchIdxStockSummary(date: string, fetcher?: typeof fetch) {
  return fetchIdxPaginated<IdxStockSummary>(endpointMap.stockSummary, { date }, fetcher);
}

export async function fetchIdxBrokerSummary(date: string, fetcher?: typeof fetch) {
  return fetchIdxPaginated<IdxBrokerSummary>(endpointMap.brokerSummary, { date }, fetcher);
}

export async function fetchIdxIndexSummary(date: string, fetcher?: typeof fetch) {
  return fetchIdxPaginated<IdxIndexSummary>(endpointMap.indexSummary, { date }, fetcher);
}

export async function fetchIdxCorporateActions(
  params: { caType: string; dateFrom?: string; dateTo?: string },
  fetcher?: typeof fetch,
) {
  return fetchIdxPaginated<IdxCorporateAction>(endpointMap.corporateActions, params, fetcher);
}

export async function fetchIdxAnnouncements(
  params: {
    keywords?: string;
    pageNumber?: number;
    pageSize?: number;
    lang?: "id" | "en";
    dateFrom?: string;
    dateTo?: string;
  },
  fetcher?: typeof fetch,
) {
  return fetchIdxDataset<IdxAnnouncement>(
    endpointMap.announcements,
    {
      ...params,
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 100,
      lang: params.lang ?? "id",
    },
    fetcher,
  );
}
