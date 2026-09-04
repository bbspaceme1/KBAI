# KBAI Index Methodology Roadmap

## Current implementation

The current KBAI Index is calculated as:

`total portfolio value / total portfolio cost × 100`

It is a useful directional community benchmark, but it is not a time-weighted return (TWR) or money-weighted return (XIRR) series. Member deposits, withdrawals, entry, and exit can therefore affect the result independently of investment performance.

BTC, Gold, and IHSG are valid performance benchmarks for comparison. They are not part of KBAI's managed investment universe and should remain clearly separated in code and UI from assets KBAI manages.

## Open methodology decisions for v2

- Define the eligible member and portfolio universe.
- Select index weighting and rebalancing rules.
- Define treatment of deposits, withdrawals, and other cash flows.
- Define corporate-action and split treatment.
- Define member entry and exit handling.
- Define outlier and bad-data treatment.
- Set a minimum member threshold for privacy-safe publication.
- Establish the base date and base value convention.
- Version and approve changes through `methodology_versions`.

A future TWR/XIRR-based implementation should be introduced as a versioned methodology with historical backtesting and a documented migration plan.
