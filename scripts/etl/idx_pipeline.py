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

from idx_fetch import IDXFetcher
from idx_calendar import trading_dates

# ─── SETUP ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", ""),
)

# ─── PIPELINE STEPS ──────────────────────────────────────────

def log_etl_execution(source: str, status: str, records: int, error: str = "", duration: int = 0, expected_count: int = None, missing_count: int = None, duplicate_count: int = None):
    """Log ETL execution to database."""
    try:
        record = {
            "run_date":        datetime.now().strftime("%Y-%m-%d"),
            "source":          source,
            "status":          status,
            "records_stored":  records,
            "expected_count": expected_count,
            "missing_count": missing_count,
            "duplicate_count": duplicate_count,
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


def reconcile_price_universe(expected_tickers: List[str], run_date: str):
    """Compare the active company universe with received prices and fail incomplete runs."""
    if not expected_tickers:
        return
    try:
        received_rows = supabase.table("idx_stock_prices").select("ticker").eq("date", run_date).execute().data or []
        received = [row["ticker"] for row in received_rows]
        expected = set(expected_tickers)
        received_set = set(received)
        missing = sorted(expected - received_set)
        duplicates = max(0, len(received) - len(received_set))
        ratio = len(missing) / len(expected)
        threshold = float(os.environ.get("IDX_ETL_PARTIAL_THRESHOLD", "0.02"))
        status = "success" if not missing and not duplicates else ("partial" if ratio <= threshold else "failed")
        result = supabase.table("idx_etl_logs").insert({
            "run_date": run_date, "source": "idx_eod_reconciliation", "status": status,
            "records_fetched": len(received), "records_stored": len(received),
            "expected_count": len(expected), "missing_count": len(missing), "duplicate_count": duplicates,
        }).execute()
        log_id = (result.data or [{}])[0].get("id")
        if log_id and missing:
            supabase.table("idx_missing_symbols").insert([{"etl_log_id": log_id, "ticker": ticker} for ticker in missing]).execute()
        if status in {"failed", "rejected"}:
            raise RuntimeError(f"IDX reconciliation {status}: {len(missing)} missing, {duplicates} duplicates")
    except Exception as exc:
        log.error("IDX reconciliation failed: %s", exc)
        raise


def step_2_fetch_prices(tickers: List[str], start_date: str, batch_size: int = 50) -> int:
    """Step 2: Fetch and store price history."""
    log.info("\n" + "="*60)
    log.info("STEP 2: FETCH PRICE HISTORY")
    log.info("="*60)
    
    start = time.time()
    total_stored = 0
    failed_batches = []
    
    try:
        # One date-first request per trading date returns the full IDX universe.
        df = IDXFetcher.get_multiple_stocks(tickers, start_date)
        if df.empty:
            raise RuntimeError("IDX returned no EOD rows for the requested range")
        try:
            df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
            df["volume"] = df["volume"].fillna(0).astype(int)
            df = df.where(pd.notna(df), None)
            records = df.to_dict(orient="records")
            for j in range(0, len(records), 500):
                subbatch = records[j:j + 500]
                supabase.table("idx_stock_prices").upsert(subbatch, on_conflict="ticker,date").execute()
                total_stored += len(subbatch)
        except Exception:
            raise
        duration = int((time.time() - start) * 1000)
        log.info(f"✅ Step 2 complete: {total_stored} price records in {duration}ms")
        log_etl_execution("idx_eod_prices", "success", total_stored, duration=duration)
        return total_stored
        
    except Exception as e:
        duration = int((time.time() - start) * 1000)
        log.error(f"❌ Step 2 failed: {e}")
        log_etl_execution("idx_eod_prices", "failed", total_stored, error=str(e), duration=duration)
        raise


def step_3_fetch_indices(days_back: int = 30) -> int:
    """Step 3: Fetch and store index prices."""
    log.info("\n" + "="*60)
    log.info("STEP 3: FETCH INDEX PRICES")
    log.info("="*60)
    
    start = time.time()
    total_stored = 0
    
    try:
        start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        records = []
        failed_dates = []
        requested_dates = trading_dates(start_date, datetime.now().strftime("%Y-%m-%d"))
        for date in requested_dates:
            try:
                df = IDXFetcher.get_index_summary(date)
                if df.empty:
                    continue
                records.extend(df.to_dict(orient="records"))
                log.info(f"  ✓ {date}: {len(df)} indices")
            except Exception as e:
                failed_dates.append(date)
                log.error(f"  ❌ Failed to fetch indices for {date}: {e}")
        if failed_dates:
            raise RuntimeError(f"Index ingestion failed for dates: {failed_dates}")
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
        raise


def step_4_compute_ratios(tickers: List[str], limit: int = None) -> int:
    """Step 4: Compute and store financial ratios."""
    log.info("\n" + "="*60)
    log.info("STEP 4: COMPUTE FINANCIAL RATIOS")
    log.info("="*60)
    
    start = time.time()
    total_stored = 0
    
    try:
        priority_tickers = {
            ticker.upper().replace(".JK", "")
            for index, ticker in enumerate(tickers)
            if limit is None or index < limit
        }
        fiscal_year = datetime.now().year
        records = []

        # Fetch each fiscal period once, then map the complete response to tickers.
        for quarter in range(1, 5):
            period_rows = IDXFetcher.get_financial_ratios(fiscal_year, quarter)
            for row in period_rows:
                ticker = str(row.get("code", "")).strip().upper()
                if ticker not in priority_tickers:
                    continue
                if not ticker or not fiscal_year or quarter not in {1, 2, 3, 4}:
                    raise ValueError(f"Invalid IDX ratio period for row: {row}")
                records.append({
                    "ticker": ticker,
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "fiscal_year": fiscal_year,
                    "fiscal_quarter": quarter,
                    "reporting_period": f"{fiscal_year}-Q{quarter}",
                    "per": row.get("per"), "pbv": row.get("priceBV"),
                    "roe": row.get("roe"), "roa": row.get("roa"),
                    "npm": row.get("npm"), "book_value": row.get("bookValue"),
                    "de_ratio": row.get("deRatio"),
                })
            log.info("  Loaded fiscal period %s-Q%s: %s rows", fiscal_year, quarter, len(period_rows))
        
        # Upsert to database
        if records:
            for i in range(0, len(records), 500):
                batch = records[i:i + 500]
                # Clean None values
                batch = [{k: (None if v is None or (isinstance(v, float) and pd.isna(v)) else v)
                          for k, v in r.items()} for r in batch]
                supabase.table("idx_financial_ratios").upsert(
                    batch, on_conflict="ticker,fiscal_year,fiscal_quarter"
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
        raise


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
        raise RuntimeError("Pipeline failed: no IDX companies were synchronized")
    
    # Step 2: Fetch prices
    start_date = "2019-01-01" if full_history else (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    step_2_fetch_prices(tickers, start_date)
    reconcile_price_universe(tickers, datetime.now().strftime("%Y-%m-%d"))
    
    # Step 3: Fetch indices
    indices_days = 1825 if full_history else 30
    step_3_fetch_indices(days_back=indices_days)
    
    # Step 4: Compute ratios (optional)
    if compute_ratios:
        step_4_compute_ratios(tickers)
    
    # Step 5: Fetch fundamentals (NEW — addresses audit DATA-02)
    if fetch_fundamentals:
        log.info("Official IDX financial ratios are fetched in STEP 4; external fundamentals are disabled.")

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
        log.error(f"❌ Step 6 failed: {e}")
        log_etl_execution("corporate_actions", "failed", 0, error=str(e))
        raise RuntimeError("Pipeline failed: corporate actions ingestion is incomplete") from e
    
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
    
    try:
        run_daily_pipeline(
            full_history=full_history,
            compute_ratios=not no_ratios,
            fetch_fundamentals=not no_fundamentals
        )
    except Exception:
        log.exception("IDX ETL terminated with a critical failure")
        sys.exit(1)
