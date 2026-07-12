"""
idx_pipeline.py - Main ETL pipeline orchestrator
Runs daily via GitHub Actions at 17:10 WIB
Part of BB Space × IDX Platform Integration
"""
import os
import sys
import logging
import time
from datetime import datetime, timedelta
from typing import List, Tuple

import pandas as pd
from supabase import create_client, Client

from idx_fetch import IDXFetcher, YFinanceFetcher
from idx_fundamentals import FundamentalDataPipeline, log_etl_execution as log_fundamentals

# ─── SETUP ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_KEY", ""),
)

# ─── PIPELINE STEPS ──────────────────────────────────────────

def log_etl_execution(source: str, status: str, records: int, error: str = "", duration: int = 0):
    """Log ETL execution to database."""
    try:
        record = {
            "run_date":        datetime.now().strftime("%Y-%m-%d"),
            "source":          source,
            "status":          status,
            "records_stored":  records,
            "error_message":   error or None,
            "execution_time":  duration,
        }
        supabase.table("idx_etl_logs").insert(record).execute()
    except Exception as e:
        log.warning(f"⚠️  Could not log ETL: {e}")


def step_1_sync_companies() -> List[str]:
    """Step 1: Sync company list from IDX."""
    log.info("\n" + "="*60)
    log.info("STEP 1: SYNC COMPANY LIST")
    log.info("="*60)
    
    start = time.time()
    try:
        companies = IDXFetcher.get_constituents()
        
        if not companies:
            log.error("❌ No companies fetched")
            return []
        
        # Upsert to Supabase
        supabase.table("idx_companies").upsert(companies, on_conflict="ticker").execute()
        
        duration = int((time.time() - start) * 1000)
        log.info(f"✅ Step 1 complete: {len(companies)} companies in {duration}ms")
        log_etl_execution("idx_companies", "success", len(companies), duration=duration)
        
        return [c["ticker"] for c in companies]
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        log.error(f"❌ Step 1 failed: {e}")
        log_etl_execution("idx_companies", "failed", 0, error=str(e), duration=duration)
        return []


def step_2_fetch_prices(tickers: List[str], start_date: str, batch_size: int = 50) -> int:
    """Step 2: Fetch and store price history."""
    log.info("\n" + "="*60)
    log.info("STEP 2: FETCH PRICE HISTORY")
    log.info("="*60)
    
    start = time.time()
    total_stored = 0
    
    try:
        # Process in batches
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i + batch_size]
            
            try:
                df = YFinanceFetcher.get_multiple_stocks(batch, start_date)
                
                if df.empty:
                    log.warning(f"  ⚠️  Batch {i//batch_size + 1}: no data")
                    continue
                
                # Clean data
                df["date"] = df["date"].dt.strftime("%Y-%m-%d")
                df["volume"] = df["volume"].fillna(0).astype(int)
                df = df.where(pd.notna(df), None)  # Convert NaN to None
                
                records = df.to_dict(orient="records")
                
                # Upsert in sub-batches (Supabase limit)
                for j in range(0, len(records), 500):
                    subbatch = records[j:j + 500]
                    supabase.table("idx_stock_prices").upsert(
                        subbatch, on_conflict="ticker,date"
                    ).execute()
                    total_stored += len(subbatch)
                
                log.info(f"  Batch {i//batch_size + 1}/{(len(tickers)-1)//batch_size + 1}: OK ({len(df)} records)")
                time.sleep(0.5)
                
            except Exception as e:
                log.error(f"  ❌ Batch {i//batch_size + 1} failed: {e}")
        
        duration = int((time.time() - start) * 1000)
        log.info(f"✅ Step 2 complete: {total_stored} price records in {duration}ms")
        log_etl_execution("yfinance_prices", "success", total_stored, duration=duration)
        
        return total_stored
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        log.error(f"❌ Step 2 failed: {e}")
        log_etl_execution("yfinance_prices", "failed", total_stored, error=str(e), duration=duration)
        return total_stored


def step_3_fetch_indices(days_back: int = 30) -> int:
    """Step 3: Fetch and store index prices."""
    log.info("\n" + "="*60)
    log.info("STEP 3: FETCH INDEX PRICES")
    log.info("="*60)
    
    start = time.time()
    total_stored = 0
    
    try:
        indices = {
            "COMPOSITE": "^JKSE",
            "LQ45":      "^JKLQ45",
        }
        
        start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        records = []
        
        for idx_code, yf_symbol in indices.items():
            try:
                df = YFinanceFetcher.get_index_data(yf_symbol, start_date)
                
                if df.empty:
                    log.warning(f"  ⚠️  No data for {idx_code}")
                    continue
                
                df["index_code"] = idx_code
                df["date"] = df["date"].dt.strftime("%Y-%m-%d")
                df["volume"] = df["volume"].fillna(0).astype(int)
                df = df.where(pd.notna(df), None)
                
                records.extend(df.to_dict(orient="records"))
                log.info(f"  ✓ {idx_code}: {len(df)} records")
                
            except Exception as e:
                log.warning(f"  ⚠️  Failed to fetch {idx_code}: {e}")
        
        # Upsert to database
        if records:
            for i in range(0, len(records), 500):
                supabase.table("idx_index_prices").upsert(
                    records[i:i + 500], on_conflict="index_code,date"
                ).execute()
                total_stored += min(500, len(records) - i)
        
        duration = int((time.time() - start) * 1000)
        log.info(f"✅ Step 3 complete: {total_stored} index records in {duration}ms")
        log_etl_execution("index_prices", "success", total_stored, duration=duration)
        
        return total_stored
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        log.error(f"❌ Step 3 failed: {e}")
        log_etl_execution("index_prices", "failed", total_stored, error=str(e), duration=duration)
        return total_stored


def step_4_compute_ratios(tickers: List[str], limit: int = 200) -> int:
    """Step 4: Compute and store financial ratios."""
    log.info("\n" + "="*60)
    log.info("STEP 4: COMPUTE FINANCIAL RATIOS")
    log.info("="*60)
    
    start = time.time()
    total_stored = 0
    
    try:
        # Limit to top stocks to save API calls
        priority_tickers = tickers[:limit]
        today = datetime.now().strftime("%Y-%m-%d")
        records = []
        
        for i, ticker in enumerate(priority_tickers):
            try:
                info = YFinanceFetcher.get_stock_info(ticker)
                
                if not info or not info.get("current_price"):
                    continue
                
                record = {
                    "ticker":           ticker,
                    "date":             today,
                    "per":              info.get("per"),
                    "pbv":              info.get("pbv"),
                    "dividend_yield":   info.get("dividend_yield"),
                    "roe":              info.get("roe"),
                    "roa":              info.get("roa"),
                    "revenue_growth":   info.get("revenue_growth"),
                    "earnings_growth":  info.get("earnings_growth"),
                    "market_cap":       info.get("market_cap"),
                }
                
                records.append(record)
                
                if (i + 1) % 50 == 0:
                    log.info(f"  Processed {i + 1}/{len(priority_tickers)} stocks")
                    time.sleep(0.2)
                
            except Exception as e:
                log.warning(f"  ⚠️  {ticker}: {e}")
        
        # Upsert to database
        if records:
            for i in range(0, len(records), 500):
                batch = records[i:i + 500]
                # Clean None values
                batch = [{k: (None if v is None or (isinstance(v, float) and pd.isna(v)) else v)
                          for k, v in r.items()} for r in batch]
                supabase.table("idx_financial_ratios").upsert(
                    batch, on_conflict="ticker,date"
                ).execute()
                total_stored += len(batch)
        
        duration = int((time.time() - start) * 1000)
        log.info(f"✅ Step 4 complete: {total_stored} ratio records in {duration}ms")
        log_etl_execution("ratios", "success", total_stored, duration=duration)
        
        return total_stored
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        log.error(f"❌ Step 4 failed: {e}")
        log_etl_execution("ratios", "failed", total_stored, error=str(e), duration=duration)
        return total_stored


def step_5_fetch_fundamentals(tickers: List[str], limit: int = 200) -> int:
    """
    Step 5: Fetch fundamental data from external sources.
    
    This addresses the audit finding DATA-02: Missing Fundamental Data Pipeline.
    
    Fetches:
    - Financial ratios (P/E, P/B, ROE, etc.)
    - Quarterly and annual financial statements
    - Dividend history
    
    Sources:
    - Sectors Financial API (primary)
    - IDX XBRL filings (fallback)
    """
    log.info("\n" + "="*60)
    log.info("STEP 5: FETCH FUNDAMENTAL DATA")
    log.info("="*60)
    log.info("📊 Fundamental Data Pipeline (WBD E-04)")
    
    start = time.time()
    total_stored = 0
    
    try:
        # Limit to reduce API load
        priority_tickers = tickers[:limit]
        
        # Sub-step 5a: Fetch financial ratios
        log.info("\n  5a. Fetching financial ratios...")
        stored_ratios, _ = FundamentalDataPipeline.fetch_and_store_ratios(priority_tickers)
        total_stored += stored_ratios
        time.sleep(2)  # Rate limiting
        
        # Sub-step 5b: Fetch financial statements (quarterly & annual)
        log.info("\n  5b. Fetching financial statements...")
        stored_financials, _ = FundamentalDataPipeline.fetch_and_store_financials(priority_tickers)
        total_stored += stored_financials
        time.sleep(2)
        
        # Sub-step 5c: Fetch dividend history
        log.info("\n  5c. Fetching dividend data...")
        stored_dividends, _ = FundamentalDataPipeline.fetch_and_store_dividends(priority_tickers)
        total_stored += stored_dividends
        
        duration = int((time.time() - start) * 1000)
        log.info(f"✅ Step 5 complete: {total_stored} fundamental records in {duration}ms")
        log_etl_execution("fundamentals", "success", total_stored, duration=duration)
        
        return total_stored
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        log.error(f"❌ Step 5 failed: {e}")
        log_etl_execution("fundamentals", "failed", total_stored, error=str(e), duration=duration)
        return total_stored


def run_daily_pipeline(
    full_history: bool = False,
    compute_ratios: bool = True,
    fetch_fundamentals: bool = True
):
    """
    Run complete daily pipeline.
    
    Args:
        full_history: Fetch full historical data
        compute_ratios: Compute technical ratios
        fetch_fundamentals: Fetch fundamental data (default True)
    """
    pipeline_start = time.time()
    
    log.info("\n" + "="*60)
    log.info("🚀 BB SPACE × IDX PLATFORM — DAILY ETL PIPELINE")
    log.info("="*60)
    log.info(f"Mode: {'FULL HISTORY' if full_history else 'INCREMENTAL'}")
    log.info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S WIB')}")
    
    # Step 1: Sync companies
    tickers = step_1_sync_companies()
    if not tickers:
        log.error("❌ Pipeline failed: No companies to process")
        return
    
    # Step 2: Fetch prices
    start_date = "2019-01-01" if full_history else (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    step_2_fetch_prices(tickers, start_date)
    
    # Step 3: Fetch indices
    indices_days = 1825 if full_history else 30
    step_3_fetch_indices(days_back=indices_days)
    
    # Step 4: Compute ratios (optional)
    if compute_ratios:
        step_4_compute_ratios(tickers)
    
    # Step 5: Fetch fundamentals (NEW — addresses audit DATA-02)
    if fetch_fundamentals:
        step_5_fetch_fundamentals(tickers, limit=200)

    # Step 6: Fetch corporate actions (dividends, splits, rights)
    try:
        from idx_corporate_actions import fetch_and_store_corporate_actions
        log.info("\n" + "="*60)
        log.info("STEP 6: FETCH CORPORATE ACTIONS")
        log.info("="*60)
        stored = fetch_and_store_corporate_actions(tickers)
        log_etl_execution("corporate_actions", "success", stored)
        log.info(f"✅ Step 6 complete: {stored} corporate actions stored")
    except Exception as e:
        log.warning(f"⚠️ Step 6 failed: {e}")
        log_etl_execution("corporate_actions", "failed", 0, error=str(e))
    
    pipeline_duration = (time.time() - pipeline_start)
    log.info("\n" + "="*60)
    log.info(f"✅ PIPELINE COMPLETE in {pipeline_duration:.1f} seconds")
    log.info("="*60 + "\n")


if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv()
    
    # Parse command line arguments
    full_history = "--full" in sys.argv
    no_ratios = "--no-ratios" in sys.argv
    no_fundamentals = "--no-fundamentals" in sys.argv
    
    run_daily_pipeline(
        full_history=full_history,
        compute_ratios=not no_ratios,
        fetch_fundamentals=not no_fundamentals
    )
