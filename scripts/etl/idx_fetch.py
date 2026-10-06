"""Official IDX data acquisition for the KBAI ETL pipeline."""
import logging
import time
from datetime import datetime
from typing import Optional, List, Dict

import pandas as pd
import requests

log = logging.getLogger(__name__)
IDX_BASE = "https://www.idx.co.id/primary"
IDX_HEADERS = {
    "User-Agent": "KBAI-ETL/1.0 (+https://www.idx.co.id/)",
    "Referer": "https://www.idx.co.id/",
    "Accept": "application/json",
}


def _records(payload: dict) -> list:
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise ValueError("IDX response did not contain a data array")
    return rows


def _number(value):
    if value in (None, "", "-"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class IDXFetcher:
    """Fetch raw and normalized datasets from official IDX endpoints only."""

    @staticmethod
    def _get(path: str, params: dict, attempts: int = 4) -> list:
        last_error = None
        for attempt in range(attempts):
            try:
                response = requests.get(
                    f"{IDX_BASE}{path}", headers=IDX_HEADERS, params=params, timeout=45
                )
                response.raise_for_status()
                return _records(response.json())
            except (requests.RequestException, ValueError) as exc:
                last_error = exc
                if attempt == attempts - 1:
                    break
                delay = min(8.0, 0.75 * (2 ** attempt))
                log.warning("IDX request failed (%s/%s) for %s: %s; retrying in %.1fs", attempt + 1, attempts, path, exc, delay)
                time.sleep(delay)
        raise RuntimeError(f"IDX request failed after {attempts} attempts: {path}") from last_error

    @staticmethod
    def _paged(path: str, params: dict, page_size: int = 500) -> list:
        rows = []
        start = 0
        while True:
            page = IDXFetcher._get(path, {**params, "start": start, "length": page_size})
            rows.extend(page)
            if len(page) < page_size:
                return rows
            start += page_size

    @staticmethod
    def get_constituents() -> List[dict]:
        rows = IDXFetcher._paged("/ListedCompany/GetCompanyProfiles", {})
        return [{
            "ticker": str(row.get("KodeEmiten", "")).strip().upper(),
            "name": str(row.get("NamaEmiten", "")).strip(),
            "sector": row.get("Sektor"),
            "sub_sector": row.get("SubSektor"),
            "board": row.get("PapanPencatatan"),
            "industry": row.get("Industri"),
            "sub_industry": row.get("SubIndustri"),
            "is_active": True,
        } for row in rows if row.get("KodeEmiten")]

    @staticmethod
    def get_stock_summary(date_str: Optional[str] = None) -> pd.DataFrame:
        rows = IDXFetcher._paged("/TradingSummary/GetStockSummary", {
            "date": date_str or datetime.now().strftime("%Y-%m-%d"),
        })
        normalized = []
        for row in rows:
            ticker = str(row.get("StockCode", "")).strip().upper()
            if not ticker:
                continue
            normalized.append({
                "ticker": ticker, "date": row.get("Date") or date_str,
                "open": _number(row.get("OpenPrice")), "high": _number(row.get("High")),
                "low": _number(row.get("Low")), "close": _number(row.get("Close")),
                "volume": _number(row.get("Volume")), "value": _number(row.get("Value")),
                "frequency": _number(row.get("Frequency")), "previous": _number(row.get("Previous")),
                "bid": _number(row.get("Bid")), "bid_volume": _number(row.get("BidVolume")),
                "offer": _number(row.get("Offer")), "offer_volume": _number(row.get("OfferVolume")),
                "listed_shares": _number(row.get("ListedShares")),
                "tradable_shares": _number(row.get("TradebleShares")),
                "foreign_buy": _number(row.get("ForeignBuy")), "foreign_sell": _number(row.get("ForeignSell")),
                "non_regular_volume": _number(row.get("NonRegularVolume")),
                "non_regular_value": _number(row.get("NonRegularValue")),
                "non_regular_frequency": _number(row.get("NonRegularFrequency")),
            })
        return pd.DataFrame(normalized)

    @staticmethod
    def get_multiple_stocks(tickers: List[str], start_date: str, end_date: Optional[str] = None) -> pd.DataFrame:
        """Fetch official daily EOD rows and filter to the requested universe."""
        wanted = {ticker.upper().replace(".JK", "") for ticker in tickers}
        end = end_date or datetime.now().strftime("%Y-%m-%d")
        dates = pd.date_range(start=start_date, end=end, freq="B")
        frames = []
        for date in dates:
            daily = IDXFetcher.get_stock_summary(date.strftime("%Y-%m-%d"))
            if not daily.empty:
                frames.append(daily[daily["ticker"].isin(wanted)])
        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    @staticmethod
    def get_index_summary(date_str: Optional[str] = None) -> pd.DataFrame:
        rows = IDXFetcher._paged("/TradingSummary/GetIndexSummary", {
            "date": date_str or datetime.now().strftime("%Y-%m-%d"),
        })
        return pd.DataFrame([{
            "index_code": row.get("IndexCode"), "index_name": row.get("IndexName"),
            "date": row.get("Date") or date_str, "open": None,
            "high": _number(row.get("Highest")), "low": _number(row.get("Lowest")),
            "close": _number(row.get("Close")), "previous": _number(row.get("Previous")),
            "volume": _number(row.get("Volume")), "value": _number(row.get("Value")),
            "frequency": _number(row.get("Frequency")), "market_cap": _number(row.get("MarketCapital")),
        } for row in rows if row.get("IndexCode")])

    @staticmethod
    def get_financial_ratios(period_year: int, period_quarter: int, page_size: int = 500) -> List[dict]:
        rows = []
        page = 1
        while True:
            batch = IDXFetcher._get("/DigitalStatistic/GetApiDataPaginated", {
                "urlName": "LINK_FINANCIAL_DATA_RATIO", "periodYear": period_year,
                "periodQuarter": period_quarter, "type": "Q", "cumulative": "false",
                "pageSize": page_size, "pageNumber": page,
            })
            rows.extend(batch)
            if len(batch) < page_size:
                return rows
            page += 1

    @staticmethod
    def get_corporate_actions(date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[dict]:
        return IDXFetcher._get("/ListingActivity/GetIssuedHistory", {
            "dateFrom": date_from or "2019-01-01", "dateTo": date_to or datetime.now().strftime("%Y-%m-%d"),
            "start": 0, "length": 9999,
        })

    @staticmethod
    def get_broker_summary(date_str: Optional[str] = None) -> pd.DataFrame:
        rows = IDXFetcher._get("/TradingSummary/GetBrokerSummary", {
            "date": date_str or datetime.now().strftime("%Y-%m-%d"), "start": 0, "length": 9999,
        })
        return pd.DataFrame(rows)


if __name__ == "__main__":
    print(f"IDX constituents: {len(IDXFetcher.get_constituents())}")
    print(f"IDX EOD rows: {len(IDXFetcher.get_stock_summary())}")
