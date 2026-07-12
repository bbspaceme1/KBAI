"""
idx_corporate_actions.py
ETL for corporate actions (dividends, splits, rights, bonus)
"""
import os
import time
import logging
from datetime import datetime
from typing import List

import pandas as pd
from supabase import create_client, Client

log = logging.getLogger(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_KEY", ""),
)


def fetch_corporate_actions_for_ticker(ticker: str) -> List[dict]:
    """Placeholder fetcher — extend to use official IDX or company filings.
    Currently tries to read dividend history from yfinance via CSV fallback if available.
    """
    # Minimal placeholder: mark that we've checked and store a 'checked' action
    return [
        {
            "ticker": ticker,
            "action_type": "checked",
            "announcement_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "effective_date": None,
            "details": {"note": "placeholder - extend fetcher to real sources"},
        }
    ]


def fetch_and_store_corporate_actions(tickers: List[str]) -> int:
    total = 0
    for ticker in tickers:
        try:
            records = fetch_corporate_actions_for_ticker(ticker)
            if not records:
                continue
            # Upsert in batches
            for i in range(0, len(records), 200):
                batch = records[i:i+200]
                supabase.table("idx_corporate_actions").upsert(batch, on_conflict=["ticker","action_type","effective_date"]).execute()
                total += len(batch)
            time.sleep(0.2)
        except Exception as e:
            log.warning(f"Failed to fetch corporate actions for {ticker}: {e}")
    return total


if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv()
    # example: read tickers from file or call IDXFetcher
    tickers = ["BBCA.JK", "TLKM.JK"]
    stored = fetch_and_store_corporate_actions(tickers)
    print(f"Stored {stored} corporate actions")
