"""
idx_compute_indicators.py - Compute technical indicators
Part of BB Space × IDX Platform Integration
"""
import os
import logging
from typing import Optional

import pandas as pd
import ta  # Technical Analysis library
from supabase import create_client, Client

# Setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_KEY", ""),
)


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all technical indicators from OHLCV DataFrame.
    df must have columns: open, high, low, close, volume, date
    
    Returns DataFrame with added indicator columns
    """
    df = df.copy().sort_values("date").reset_index(drop=True)
    
    # Ensure correct data types
    for col in ["open", "high", "low", "close"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0)
    
    # ─── MOVING AVERAGES ─────────────────────────────────────
    try:
        df["sma_5"]   = ta.trend.sma_indicator(df["close"], window=5)
        df["sma_20"]  = ta.trend.sma_indicator(df["close"], window=20)
        df["sma_50"]  = ta.trend.sma_indicator(df["close"], window=50)
        df["sma_200"] = ta.trend.sma_indicator(df["close"], window=200)
        df["ema_12"]  = ta.trend.ema_indicator(df["close"], window=12)
        df["ema_26"]  = ta.trend.ema_indicator(df["close"], window=26)
        log.info("  ✓ Moving averages computed")
    except Exception as e:
        log.warning(f"  ⚠️  Moving averages: {e}")
    
    # ─── RSI ─────────────────────────────────────────────────
    try:
        df["rsi_14"] = ta.momentum.rsi(df["close"], window=14)
        log.info("  ✓ RSI computed")
    except Exception as e:
        log.warning(f"  ⚠️  RSI: {e}")
    
    # ─── MACD ────────────────────────────────────────────────
    try:
        macd = ta.trend.MACD(df["close"], window_fast=12, window_slow=26, window_sign=9)
        df["macd"]        = macd.macd()
        df["macd_signal"] = macd.macd_signal()
        df["macd_hist"]   = macd.macd_diff()
        log.info("  ✓ MACD computed")
    except Exception as e:
        log.warning(f"  ⚠️  MACD: {e}")
    
    # ─── BOLLINGER BANDS ─────────────────────────────────────
    try:
        bb = ta.volatility.BollingerBands(df["close"], window=20, window_dev=2)
        df["bb_upper"]  = bb.bollinger_hband()
        df["bb_middle"] = bb.bollinger_mavg()
        df["bb_lower"]  = bb.bollinger_lband()
        log.info("  ✓ Bollinger Bands computed")
    except Exception as e:
        log.warning(f"  ⚠️  Bollinger Bands: {e}")
    
    # ─── VOLUME SMA ──────────────────────────────────────────
    try:
        df["vol_sma_20"] = df["volume"].rolling(window=20).mean()
        log.info("  ✓ Volume SMA computed")
    except Exception as e:
        log.warning(f"  ⚠️  Volume SMA: {e}")
    
    return df


def store_indicators(ticker: str, df: pd.DataFrame) -> int:
    """Compute and store technical indicators for a stock."""
    try:
        df_ind = compute_indicators(df)
        
        # Select relevant columns
        cols = [
            "date", "sma_5", "sma_20", "sma_50", "sma_200",
            "ema_12", "ema_26", "rsi_14", "macd", "macd_signal",
            "macd_hist", "bb_upper", "bb_middle", "bb_lower", "vol_sma_20"
        ]
        
        records = df_ind[cols].dropna(subset=["rsi_14"]).copy()
        records["ticker"] = ticker
        
        # Convert date to string
        if hasattr(records["date"].iloc[0], "isoformat"):
            records["date"] = records["date"].dt.strftime("%Y-%m-%d")
        
        # Convert NaN to None
        records = records.where(pd.notna(records), None)
        
        data = records.to_dict(orient="records")
        
        # Upsert in batches
        total = 0
        for i in range(0, len(data), 500):
            batch = data[i:i + 500]
            supabase.table("idx_technical_indicators").upsert(
                batch, on_conflict="ticker,date"
            ).execute()
            total += len(batch)
        
        return total
        
    except Exception as e:
        log.error(f"❌ Failed to store indicators for {ticker}: {e}")
        return 0


def compute_for_all_stocks(tickers: list, limit: Optional[int] = 100) -> int:
    """
    Compute and store indicators for all stocks with recent price data.
    
    Args:
        tickers: List of ticker symbols
        limit: Maximum number of stocks to process (to save time)
    """
    log.info(f"📊 Computing technical indicators for {len(tickers[:limit])} stocks...")
    
    total_stored = 0
    process_tickers = tickers[:limit] if limit else tickers
    
    for i, ticker in enumerate(process_tickers):
        try:
            # Get recent price data for this stock
            result = supabase.table("idx_stock_prices") \
                .select("date,open,high,low,close,volume") \
                .eq("ticker", ticker) \
                .order("date", desc=False) \
                .limit(365) \
                .execute()
            
            if not result.data:
                continue
            
            df = pd.DataFrame(result.data)
            df["date"] = pd.to_datetime(df["date"])
            
            n = store_indicators(ticker, df)
            total_stored += n
            
            if (i + 1) % 20 == 0:
                log.info(f"  Progress: {i + 1}/{len(process_tickers)} stocks processed")
            
        except Exception as e:
            log.warning(f"  ⚠️  {ticker}: {e}")
    
    log.info(f"✅ Computed indicators for {total_stored} records")
    return total_stored


if __name__ == "__main__":
    import sys
    import dotenv
    dotenv.load_dotenv()
    
    # Get all tickers
    try:
        result = supabase.table("idx_companies").select("ticker").eq("is_active", True).execute()
        tickers = [row["ticker"] for row in result.data]
        
        limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
        compute_for_all_stocks(tickers, limit=limit)
        
    except Exception as e:
        log.error(f"❌ Failed to run: {e}")
