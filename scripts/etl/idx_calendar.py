"""Trading-date policy for IDX ingestion.

The exchange calendar is supplied as an explicit, versioned holiday list so ETL
never treats every Monday-Friday as a confirmed trading day. Update the list
when IDX publishes a new closure calendar; unknown weekdays remain candidates
and are classified by the EOD response as NO_TRADING_DATA.
"""
from __future__ import annotations

import os
from datetime import date
import pandas as pd

_DEFAULT_CLOSURES = {
    # IDX closures commonly observed in the current operating window.
    "2024-02-08", "2024-02-09", "2024-03-11", "2024-03-29",
    "2024-04-08", "2024-04-09", "2024-04-10", "2024-04-11", "2024-04-12",
    "2024-05-01", "2024-05-09", "2024-05-23", "2024-06-17",
    "2024-08-17", "2024-09-16", "2024-12-25", "2024-12-26",
    "2025-01-01", "2025-01-27", "2025-03-28", "2025-03-31", "2025-04-01",
    "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-18", "2025-05-01",
    "2025-05-12", "2025-05-29", "2025-06-06", "2025-06-27", "2025-08-17",
    "2025-09-05", "2025-12-25", "2025-12-26",
    "2026-01-01", "2026-03-18", "2026-03-19", "2026-03-20", "2026-04-03",
    "2026-05-01", "2026-05-14", "2026-05-27", "2026-06-01", "2026-06-17",
    "2026-08-17", "2026-12-25",
}


def _closures() -> set[str]:
    configured = os.getenv("IDX_TRADING_HOLIDAYS", "")
    return _DEFAULT_CLOSURES | {item.strip() for item in configured.split(",") if item.strip()}


def trading_dates(start: str, end: str) -> list[str]:
    closures = _closures()
    return [
        stamp.strftime("%Y-%m-%d")
        for stamp in pd.date_range(start=start, end=end, freq="D")
        if stamp.weekday() < 5 and stamp.strftime("%Y-%m-%d") not in closures
    ]


def classify_empty_date(date_value: str) -> str:
    return "NO_TRADING_DATA"


__all__ = ["trading_dates", "classify_empty_date"]
""
