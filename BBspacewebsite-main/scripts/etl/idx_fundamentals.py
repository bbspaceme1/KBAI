"""
idx_fundamentals.py - Fetch fundamental and financial data for IDX stocks
Implements the missing Fundamental Data Pipeline (WBD E-04)
Part of BB Space × IDX Platform Integration

Data Sources:
1. Sectors Financial API (IDX-specific fundamentals) 
2. IDX XBRL Reports (official financial statements)
3. Real-time P/E calculation from live prices and EPS
4. Dividend data from IDX announcements
"""
import logging
import time
import os
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
import json

import requests
import pandas as pd
import numpy as np
from bs4 import BeautifulSoup
from supabase import create_client, Client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_KEY", ""),
)

IDX_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.idx.co.id/",
    "Accept": "application/json, text/plain, */*",
}

# ─── SECTORS FINANCIAL API ──────────────────────────────────────
class SectorsFinancialFetcher:
    """
    Fetch fundamental data from Sectors Financial API
    Covers: Fundamental ratios, financial statements, dividend data
    """
    
    BASE_URL = "https://www.sectors.app/api"
    
    @staticmethod
    def get_stock_profile(ticker: str) -> Optional[Dict]:
        """
        Fetch stock profile including fundamental data.
        
        Returns:
            Dictionary with stock profile or None if failed
        """
        log.info(f"  Fetching profile for {ticker}...")
        
        try:
            url = f"{SectorsFinancialFetcher.BASE_URL}/stock/{ticker}/profile"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            data = resp.json()
            return data.get("profile") if data else None
            
        except Exception as e:
            log.warning(f"    ⚠️  Failed to fetch profile for {ticker}: {e}")
            return None
    
    @staticmethod
    def get_financial_ratios(ticker: str) -> Optional[Dict]:
        """
        Fetch financial ratios (P/E, P/B, ROE, etc.)
        
        Latest available quarter/year
        """
        log.info(f"  Fetching ratios for {ticker}...")
        
        try:
            url = f"{SectorsFinancialFetcher.BASE_URL}/stock/{ticker}/ratio/latest"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            return resp.json()
            
        except Exception as e:
            log.warning(f"    ⚠️  Failed to fetch ratios for {ticker}: {e}")
            return None
    
    @staticmethod
    def get_financials_quarterly(ticker: str) -> Optional[List[Dict]]:
        """
        Fetch quarterly financial statements.
        
        Returns list of quarterly reports (newest first)
        """
        log.info(f"  Fetching quarterly financials for {ticker}...")
        
        try:
            url = f"{SectorsFinancialFetcher.BASE_URL}/stock/{ticker}/financials/quarterly"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            data = resp.json()
            return data.get("quarterly", []) if data else []
            
        except Exception as e:
            log.warning(f"    ⚠️  Failed to fetch quarterly for {ticker}: {e}")
            return []
    
    @staticmethod
    def get_financials_annual(ticker: str) -> Optional[List[Dict]]:
        """
        Fetch annual financial statements.
        
        Returns list of annual reports (newest first)
        """
        log.info(f"  Fetching annual financials for {ticker}...")
        
        try:
            url = f"{SectorsFinancialFetcher.BASE_URL}/stock/{ticker}/financials/annual"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            data = resp.json()
            return data.get("annual", []) if data else []
            
        except Exception as e:
            log.warning(f"    ⚠️  Failed to fetch annual for {ticker}: {e}")
            return []
    
    @staticmethod
    def get_dividends(ticker: str) -> Optional[List[Dict]]:
        """
        Fetch dividend history.
        
        Returns list of dividends with ex_date, payment_date, amount
        """
        log.info(f"  Fetching dividends for {ticker}...")
        
        try:
            url = f"{SectorsFinancialFetcher.BASE_URL}/stock/{ticker}/dividend"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            data = resp.json()
            return data.get("dividends", []) if data else []
            
        except Exception as e:
            log.warning(f"    ⚠️  Failed to fetch dividends for {ticker}: {e}")
            return []


# ─── IDX XBRL DATA PARSER ───────────────────────────────────────
class IDXXBRLFetcher:
    """
    Parse IDX official XBRL reports for financial data.
    Provides authoritative financial statements directly from IDX.
    
    Note: IDX XBRL is complex; this is a starter implementation.
    Production version would use full XBRL parser library (xbrl-py).
    """
    
    BASE_URL = "https://www.idx.co.id"
    
    @staticmethod
    def get_filing_documents(ticker: str) -> List[Dict]:
        """
        Fetch list of XBRL filings for a company.
        
        Returns list of filing metadata (URL, date, type)
        """
        log.info(f"  Searching IDX filings for {ticker}...")
        
        try:
            # IDX filings are typically available through their announcements
            url = f"{IDXXBRLFetcher.BASE_URL}/umbraco/Surface/Company/GetCompanyTransactionOverView"
            
            params = {
                "code": ticker,
                "start": 0,
                "length": 100,
                "type": "xbrl",  # XBRL reports
            }
            
            resp = requests.get(url, headers=IDX_HEADERS, params=params, timeout=30)
            resp.raise_for_status()
            
            filings = []
            for item in resp.json().get("data", []):
                filings.append({
                    "date": item.get("date"),
                    "type": item.get("type"),  # Annual (tahunan), Quarterly (triwulanan)
                    "url": item.get("url"),
                })
            
            return filings
            
        except Exception as e:
            log.warning(f"    ⚠️  Failed to fetch IDX filings for {ticker}: {e}")
            return []


# ─── REAL-TIME VALUATION CALCULATIONS ───────────────────────────
class ValuationCalculator:
    """
    Calculate valuation metrics in real-time from price and fundamentals.
    
    Provides:
    - P/E Ratio: Price / EPS
    - P/B Ratio: Price / Book Value Per Share
    - Price/Sales: Market Cap / Revenue
    - EV/EBITDA: Enterprise Value / EBITDA
    """
    
    @staticmethod
    def calculate_pe_ratio(current_price: float, eps: float) -> Optional[float]:
        """P/E = Current Price / EPS"""
        if eps and eps > 0:
            return round(current_price / eps, 2)
        return None
    
    @staticmethod
    def calculate_pb_ratio(current_price: float, bvps: float) -> Optional[float]:
        """P/B = Current Price / Book Value Per Share"""
        if bvps and bvps > 0:
            return round(current_price / bvps, 2)
        return None
    
    @staticmethod
    def calculate_ps_ratio(market_cap: float, revenue: float) -> Optional[float]:
        """P/S = Market Cap / Annual Revenue"""
        if revenue and revenue > 0:
            return round(market_cap / revenue, 2)
        return None
    
    @staticmethod
    def calculate_ev_ebitda(
        market_cap: float,
        debt: float,
        cash: float,
        ebitda: float
    ) -> Optional[float]:
        """EV/EBITDA = (Market Cap + Debt - Cash) / EBITDA"""
        if ebitda and ebitda > 0:
            ev = market_cap + debt - cash
            return round(ev / ebitda, 2)
        return None
    
    @staticmethod
    def calculate_dividend_yield(
        annual_dividend_per_share: float,
        current_price: float
    ) -> Optional[float]:
        """Dividend Yield = Annual Dividend Per Share / Current Price"""
        if current_price and current_price > 0:
            yield_pct = (annual_dividend_per_share / current_price) * 100
            return round(yield_pct, 4)
        return None


# ─── MAIN FUNDAMENTAL DATA PIPELINE ──────────────────────────────
class FundamentalDataPipeline:
    """
    Orchestrate fetching and storing of fundamental data.
    
    Cadence:
    - Daily: Real-time ratios (P/E, P/B) from live price
    - Quarterly: After earnings announcements (update from Sectors API)
    - Annual: After annual reports (update from IDX XBRL)
    """
    
    @staticmethod
    def fetch_and_store_ratios(tickers: List[str]) -> Tuple[int, int]:
        """
        Fetch financial ratios for all tickers.
        
        Returns:
            (successful_stored, total_tickers)
        """
        log.info(f"\n📊 FETCHING FINANCIAL RATIOS for {len(tickers)} tickers")
        
        stored = 0
        
        for ticker in tickers:
            try:
                # Get latest price
                latest_price_record = supabase.table("idx_stock_prices") \
                    .select("close, date") \
                    .eq("ticker", ticker) \
                    .order("date", desc=True) \
                    .limit(1) \
                    .execute()
                
                if not latest_price_record.data:
                    log.warning(f"  ⚠️  {ticker}: No price data found")
                    continue
                
                current_price = latest_price_record.data[0]["close"]
                price_date = latest_price_record.data[0]["date"]
                
                # Fetch from Sectors API
                ratios = SectorsFinancialFetcher.get_financial_ratios(ticker)
                
                if not ratios:
                    log.warning(f"  ⚠️  {ticker}: No ratios fetched")
                    continue
                
                # Get latest market cap (in IDX, market cap = shares * price)
                company = supabase.table("idx_companies") \
                    .select("shares_listed") \
                    .eq("ticker", ticker) \
                    .single() \
                    .execute()
                
                market_cap = None
                if company.data and company.data.get("shares_listed"):
                    market_cap = company.data["shares_listed"] * current_price
                
                # Build record
                record = {
                    "ticker": ticker,
                    "date": price_date,
                    "per": ratios.get("pe"),
                    "pbv": ratios.get("pb"),
                    "ps": ratios.get("ps"),
                    "ev_ebitda": ratios.get("ev_ebitda"),
                    "roe": ratios.get("roe"),
                    "roa": ratios.get("roa"),
                    "npm": ratios.get("npm"),
                    "gpm": ratios.get("gpm"),
                    "current_ratio": ratios.get("current_ratio"),
                    "debt_to_equity": ratios.get("der"),
                    "revenue_growth": ratios.get("revenue_growth"),
                    "earnings_growth": ratios.get("earnings_growth"),
                    "dividend_yield": ratios.get("dividend_yield"),
                    "payout_ratio": ratios.get("payout_ratio"),
                    "market_cap": market_cap,
                }
                
                # Store (upsert to avoid duplicates for same date)
                supabase.table("idx_financial_ratios") \
                    .upsert(record, on_conflict="ticker,date") \
                    .execute()
                
                stored += 1
                log.info(f"  ✅ {ticker}: stored ratios")
                
            except Exception as e:
                log.error(f"  ❌ {ticker}: {e}")
                continue
        
        log.info(f"✅ Ratios complete: {stored}/{len(tickers)} stored")
        return stored, len(tickers)
    
    @staticmethod
    def fetch_and_store_financials(tickers: List[str]) -> Tuple[int, int]:
        """
        Fetch quarterly and annual financial statements.
        
        Returns:
            (records_stored, total_tickers)
        """
        log.info(f"\n📈 FETCHING FINANCIAL STATEMENTS for {len(tickers)} tickers")
        
        stored = 0
        
        for ticker in tickers:
            try:
                # Fetch quarterly
                quarterly = SectorsFinancialFetcher.get_financials_quarterly(ticker)
                
                for q_data in quarterly[:4]:  # Only last 4 quarters
                    record = {
                        "ticker": ticker,
                        "period_type": "quarterly",
                        "period_year": q_data.get("year"),
                        "period_quarter": q_data.get("quarter"),
                        "revenue": q_data.get("revenue"),
                        "gross_profit": q_data.get("gross_profit"),
                        "operating_income": q_data.get("operating_income"),
                        "net_income": q_data.get("net_income"),
                        "ebitda": q_data.get("ebitda"),
                        "total_assets": q_data.get("total_assets"),
                        "total_equity": q_data.get("total_equity"),
                        "total_debt": q_data.get("total_debt"),
                        "cash": q_data.get("cash"),
                        "operating_cf": q_data.get("operating_cf"),
                        "investing_cf": q_data.get("investing_cf"),
                        "financing_cf": q_data.get("financing_cf"),
                        "capex": q_data.get("capex"),
                        "eps": q_data.get("eps"),
                        "bvps": q_data.get("bvps"),
                    }
                    
                    supabase.table("idx_financials") \
                        .upsert(record, on_conflict="ticker,period_type,period_year,period_quarter") \
                        .execute()
                    
                    stored += 1
                
                # Fetch annual
                annual = SectorsFinancialFetcher.get_financials_annual(ticker)
                
                for a_data in annual[:5]:  # Only last 5 years
                    record = {
                        "ticker": ticker,
                        "period_type": "annual",
                        "period_year": a_data.get("year"),
                        "period_quarter": None,
                        "revenue": a_data.get("revenue"),
                        "gross_profit": a_data.get("gross_profit"),
                        "operating_income": a_data.get("operating_income"),
                        "net_income": a_data.get("net_income"),
                        "ebitda": a_data.get("ebitda"),
                        "total_assets": a_data.get("total_assets"),
                        "total_equity": a_data.get("total_equity"),
                        "total_debt": a_data.get("total_debt"),
                        "cash": a_data.get("cash"),
                        "operating_cf": a_data.get("operating_cf"),
                        "investing_cf": a_data.get("investing_cf"),
                        "financing_cf": a_data.get("financing_cf"),
                        "capex": a_data.get("capex"),
                        "eps": a_data.get("eps"),
                        "bvps": a_data.get("bvps"),
                    }
                    
                    supabase.table("idx_financials") \
                        .upsert(record, on_conflict="ticker,period_type,period_year,period_quarter") \
                        .execute()
                    
                    stored += 1
                
                log.info(f"  ✅ {ticker}: stored {len(quarterly) + len(annual)} periods")
                
            except Exception as e:
                log.error(f"  ❌ {ticker}: {e}")
                continue
        
        log.info(f"✅ Financials complete: {stored} records stored")
        return stored, len(tickers)
    
    @staticmethod
    def fetch_and_store_dividends(tickers: List[str]) -> Tuple[int, int]:
        """
        Fetch dividend history.
        
        Returns:
            (records_stored, total_tickers)
        """
        log.info(f"\n💰 FETCHING DIVIDENDS for {len(tickers)} tickers")
        
        stored = 0
        
        for ticker in tickers:
            try:
                dividends = SectorsFinancialFetcher.get_dividends(ticker)
                
                for div_data in dividends:
                    record = {
                        "ticker": ticker,
                        "ex_date": div_data.get("ex_date"),
                        "payment_date": div_data.get("payment_date"),
                        "amount": div_data.get("amount"),
                        "type": div_data.get("type", "final"),
                    }
                    
                    supabase.table("idx_dividends") \
                        .upsert(record, on_conflict="ticker,ex_date") \
                        .execute()
                    
                    stored += 1
                
                if dividends:
                    log.info(f"  ✅ {ticker}: {len(dividends)} dividends")
                
            except Exception as e:
                log.error(f"  ❌ {ticker}: {e}")
                continue
        
        log.info(f"✅ Dividends complete: {stored} records stored")
        return stored, len(tickers)


# ─── UTILITY FUNCTIONS ──────────────────────────────────────────

def log_etl_execution(
    source: str,
    status: str,
    records_fetched: int,
    records_stored: int,
    error: str = "",
    duration: int = 0
):
    """Log fundamental data ETL execution."""
    try:
        record = {
            "run_date": datetime.now().strftime("%Y-%m-%d"),
            "source": f"fundamentals_{source}",
            "status": status,
            "records_fetched": records_fetched,
            "records_stored": records_stored,
            "error_message": error or None,
            "execution_time": duration,
        }
        supabase.table("idx_etl_logs").insert(record).execute()
    except Exception as e:
        log.warning(f"⚠️  Could not log ETL: {e}")


if __name__ == "__main__":
    """
    Quick test/standalone run
    
    Usage:
      python idx_fundamentals.py
    """
    log.info("IDX Fundamentals Data Pipeline — Test Run")
    log.info("=" * 60)
    
    # For testing: fetch just 5 tickers
    test_tickers = ["BBCA", "TLKM", "ASII", "BMRI", "UNVR"]
    
    try:
        # Fetch ratios
        stored, total = FundamentalDataPipeline.fetch_and_store_ratios(test_tickers)
        log_etl_execution("ratios", "success", total, stored)
        
        time.sleep(2)  # Rate limiting
        
        # Fetch financials
        stored, total = FundamentalDataPipeline.fetch_and_store_financials(test_tickers)
        log_etl_execution("financials", "success", total, stored)
        
        time.sleep(2)
        
        # Fetch dividends
        stored, total = FundamentalDataPipeline.fetch_and_store_dividends(test_tickers)
        log_etl_execution("dividends", "success", total, stored)
        
        log.info("\n✅ Fundamental data fetch complete!")
        
    except Exception as e:
        log.error(f"❌ Pipeline failed: {e}")
        log_etl_execution("all", "failed", 0, 0, str(e))
