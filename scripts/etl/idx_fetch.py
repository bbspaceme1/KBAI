"""
idx_fetch.py - Fetch data from various IDX sources
Part of BB Space × IDX Platform Integration
"""
import logging
import time
from typing import Optional, List
from datetime import datetime, timedelta

import requests
import pandas as pd
import yfinance as yf

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

IDX_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.idx.co.id/",
    "Accept": "application/json, text/plain, */*",
}

IDX_BASE = "https://www.idx.co.id/umbraco/Surface"

# ─── IDX.co.id Internal Endpoints ────────────────────────────
class IDXFetcher:
    """Fetch data from IDX.co.id internal endpoints"""
    
    @staticmethod
    def get_constituents() -> List[dict]:
        """Ambil daftar semua emiten IDX."""
        log.info("📋 Fetching company list from IDX...")
        
        url = f"{IDX_BASE}/StockData/GetConstituent"
        try:
            resp = requests.get(url, headers=IDX_HEADERS, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            companies = []
            for item in data.get("data", []):
                ticker = item.get("Code", "").strip()
                if len(ticker) >= 2:  # Filter valid tickers
                    companies.append({
                        "ticker":       ticker,
                        "name":         item.get("Name", "").strip(),
                        "sector":       item.get("Sector", "").strip(),
                        "sub_sector":   item.get("SubSector", "").strip(),
                        "board":        item.get("Board", "").strip(),
                        "listing_date": item.get("ListingDate"),
                        "is_active":    True,
                    })
            
            log.info(f"✅ Found {len(companies)} active companies")
            return companies
            
        except Exception as e:
            log.error(f"❌ Failed to fetch constituents: {e}")
            return []
    
    @staticmethod
    def get_stock_summary(date_str: Optional[str] = None) -> pd.DataFrame:
        """Ambil summary perdagangan semua saham."""
        log.info("📊 Fetching daily stock summary...")
        
        url = f"{IDX_BASE}/ListedCompany/GetStockSummary"
        params = {
            "start":    0,
            "length":   9999,
            "exchange": "NYSE",  # Stay as NYSE despite being IDX
            "language": "id-id",
        }
        if date_str:
            params["date"] = date_str
        
        try:
            resp = requests.get(url, headers=IDX_HEADERS, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            records = []
            for item in data.get("data", []):
                records.append({
                    "ticker":       item.get("code", "").strip().upper(),
                    "date":         date_str or datetime.now().strftime("%Y-%m-%d"),
                    "close":        float(item.get("price", 0)) if item.get("price") else None,
                    "volume":       int(item.get("volume", 0)) if item.get("volume") else None,
                    "value":        int(item.get("value", 0)) if item.get("value") else None,
                })
            
            return pd.DataFrame(records) if records else pd.DataFrame()
            
        except Exception as e:
            log.error(f"❌ Failed to fetch stock summary: {e}")
            return pd.DataFrame()
    
    @staticmethod
    def get_financial_ratio(ticker: str) -> dict:
        """Ambil rasio keuangan emiten."""
        url = f"{IDX_BASE}/StockData/GetFinancialRatio"
        params = {"emiten": ticker}
        
        try:
            resp = requests.get(url, headers=IDX_HEADERS, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning(f"⚠️  Could not fetch ratios for {ticker}: {e}")
            return {}


# ─── Yahoo Finance Data (Unofficial, but reliable for historical) ────
class YFinanceFetcher:
    """Fetch data from Yahoo Finance (covers IDX tickers)"""
    
    @staticmethod
    def get_historical_price(
        ticker: str,
        start_date: str,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Ambil data historis harga saham IDX dari Yahoo Finance.
        
        Args:
            ticker: Kode ticker IDX (tanpa .JK), misal 'BBCA'
            start_date: Format 'YYYY-MM-DD'
            end_date: Format 'YYYY-MM-DD', default hari ini
        """
        yf_ticker = f"{ticker}.JK"
        
        try:
            stock = yf.Ticker(yf_ticker)
            df = stock.history(start=start_date, end=end_date, interval="1d")
            
            if df.empty:
                log.warning(f"⚠️  No data for {ticker}")
                return pd.DataFrame()
            
            df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
            df.index = pd.to_datetime(df.index).tz_localize(None)
            df.index.name = "date"
            df.columns = ["open", "high", "low", "close", "volume"]
            df["ticker"] = ticker
            
            return df.reset_index().dropna(subset=["close"])
            
        except Exception as e:
            log.warning(f"⚠️  Failed to fetch {ticker}: {e}")
            return pd.DataFrame()
    
    @staticmethod
    def get_multiple_stocks(
        tickers: List[str],
        start_date: str,
        end_date: Optional[str] = None
    ) -> pd.DataFrame:
        """Ambil data historis banyak saham sekaligus (lebih efisien)."""
        log.info(f"📈 Downloading price history for {len(tickers)} stocks...")
        
        yf_tickers = [f"{t}.JK" for t in tickers]
        
        try:
            raw = yf.download(
                tickers=yf_tickers,
                start=start_date,
                end=end_date,
                interval="1d",
                group_by="ticker",
                auto_adjust=True,
                threads=True,
                progress=False,
            )
            
            dfs = []
            for yf_t, idx_t in zip(yf_tickers, tickers):
                try:
                    if len(yf_tickers) == 1:
                        df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
                    else:
                        df = raw[yf_t][["Open", "High", "Low", "Close", "Volume"]].copy()
                    
                    df.index = pd.to_datetime(df.index).tz_localize(None)
                    df.columns = ["open", "high", "low", "close", "volume"]
                    df["ticker"] = idx_t
                    df.index.name = "date"
                    
                    dfs.append(df.reset_index().dropna(subset=["close"]))
                    
                except Exception as e:
                    log.warning(f"  ⚠️  Skip {idx_t}: {e}")
                    time.sleep(0.1)
            
            return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()
            
        except Exception as e:
            log.error(f"❌ Failed to download prices: {e}")
            return pd.DataFrame()
    
    @staticmethod
    def get_stock_info(ticker: str) -> dict:
        """Ambil data fundamental saham."""
        try:
            stock = yf.Ticker(f"{ticker}.JK")
            info = stock.info
            
            return {
                "ticker":           ticker,
                "name":             info.get("longName", ""),
                "sector":           info.get("sector", ""),
                "industry":         info.get("industry", ""),
                "market_cap":       info.get("marketCap"),
                "current_price":    info.get("currentPrice"),
                "per":              info.get("trailingPE"),
                "pbv":              info.get("priceToBook"),
                "dividend_yield":   info.get("dividendYield"),
                "roe":              info.get("returnOnEquity"),
                "roa":              info.get("returnOnAssets"),
                "revenue_growth":   info.get("revenueGrowth"),
                "earnings_growth":  info.get("earningsGrowth"),
                "beta":             info.get("beta"),
                "52w_high":         info.get("fiftyTwoWeekHigh"),
                "52w_low":          info.get("fiftyTwoWeekLow"),
            }
        except Exception as e:
            log.warning(f"⚠️  Could not fetch info for {ticker}: {e}")
            return {}
    
    @staticmethod
    def get_index_data(index_symbol: str, start_date: str, end_date: Optional[str] = None) -> pd.DataFrame:
        """Ambil data historis indeks (COMPOSITE, LQ45, dll)."""
        try:
            df = yf.download(index_symbol, start=start_date, end=end_date, progress=False)
            df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
            df.columns = ["open", "high", "low", "close", "volume"]
            df.index = pd.to_datetime(df.index).tz_localize(None)
            df.index.name = "date"
            
            return df.reset_index()
        except Exception as e:
            log.warning(f"⚠️  Could not fetch index {index_symbol}: {e}")
            return pd.DataFrame()


# ─── Test Functions ─────────────────────────────────────────
if __name__ == "__main__":
    import pprint
    
    # Test IDX fetcher
    companies = IDXFetcher.get_constituents()
    print(f"\n📋 Found {len(companies)} companies")
    if companies:
        pprint.pprint(companies[:2])
    
    # Test Yahoo Finance
    df = YFinanceFetcher.get_historical_price("BBCA", "2024-01-01", "2024-01-31")
    print(f"\n📈 BBCA price data: {len(df)} rows")
    print(df.head())
    
    # Test multiple stocks
    df_multi = YFinanceFetcher.get_multiple_stocks(["BBCA", "TLKM"], "2024-01-01")
    print(f"\n📊 Multiple stocks: {len(df_multi)} rows")
    print(df_multi.head())
