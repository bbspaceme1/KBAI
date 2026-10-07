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
from idx_fetch import IDXFetcher

log = logging.getLogger(__name__)

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL", ""),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", ""),
)


def _normalize_action(row: dict) -> dict:
    ticker = str(row.get("KodeEmiten", "")).strip().upper()
    return {
        "ticker": ticker,
        "action_type": row.get("JenisTindakan"),
        "announcement_date": row.get("TanggalPengumuman") or row.get("TanggalPencatatan"),
        "effective_date": row.get("TanggalPencatatan"),
        "details": row,
    }


def fetch_corporate_actions_for_ticker(ticker: str) -> List[dict]:
    """Filter one ticker from a single official IDX history response."""
    wanted = ticker.upper().replace(".JK", "")
    return [row for row in fetch_corporate_actions_bulk([wanted]) if row["ticker"] == wanted]


def fetch_corporate_actions_bulk(tickers: List[str]) -> List[dict]:
    """Fetch the date-window once, then normalize/filter locally."""
    wanted = {ticker.upper().replace(".JK", "") for ticker in tickers}
    rows = IDXFetcher.get_corporate_actions()
    return [_normalize_action(row) for row in rows if str(row.get("KodeEmiten", "")).strip().upper() in wanted]


def fetch_and_store_corporate_actions(tickers: List[str]) -> int:
    records = fetch_corporate_actions_bulk(tickers)
    total = 0
    for i in range(0, len(records), 200):
        batch = records[i:i + 200]
        supabase.table("idx_corporate_actions").upsert(
            batch, on_conflict=["ticker", "action_type", "effective_date"]
        ).execute()
        total += len(batch)
    log.info("Stored %s corporate actions from one IDX bulk request", total)
    return total


if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv()
    # Example tickers are official IDX issuer codes.
    tickers = ["BBCA", "TLKM"]
    stored = fetch_and_store_corporate_actions(tickers)
    print(f"Stored {stored} corporate actions")
