-- ============================================================
-- IDX STOCK PLATFORM — DATABASE SCHEMA
-- Migration: Add IDX data tables to BB Space
-- Date: 2026-05-13
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- ─── TABLE: IDX COMPANIES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS idx_companies (
    ticker          VARCHAR(10)  PRIMARY KEY,
    name            VARCHAR(300) NOT NULL,
    name_short      VARCHAR(100),
    sector          VARCHAR(100),
    sub_sector      VARCHAR(100),
    board           VARCHAR(50),          -- Utama, Pengembangan, Akselerasi
    listing_date    DATE,
    shares_listed   BIGINT,               -- Jumlah saham beredar
    logo_url        TEXT,
    website         TEXT,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── TABLE: IDX STOCK PRICES DAILY ───────────────────────────
CREATE TABLE IF NOT EXISTS idx_stock_prices (
    id          BIGSERIAL    PRIMARY KEY,
    ticker      VARCHAR(10)  NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
    date        DATE         NOT NULL,
    open        NUMERIC(14,2),
    high        NUMERIC(14,2),
    low         NUMERIC(14,2),
    close       NUMERIC(14,2) NOT NULL,
    volume      BIGINT,
    value       BIGINT,                   -- Nilai transaksi dalam rupiah
    frequency   INTEGER,                  -- Frekuensi transaksi
    foreign_buy BIGINT,                   -- Net foreign buy (lot)
    foreign_sell BIGINT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ticker, date)
);

-- ─── TABLE: IDX INDICES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS idx_index_prices (
    id          BIGSERIAL    PRIMARY KEY,
    index_code  VARCHAR(20)  NOT NULL,    -- COMPOSITE, LQ45, IDX30, dll
    date        DATE         NOT NULL,
    open        NUMERIC(14,2),
    high        NUMERIC(14,2),
    low         NUMERIC(14,2),
    close       NUMERIC(14,2) NOT NULL,
    volume      BIGINT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(index_code, date)
);

-- ─── TABLE: FINANCIAL RATIOS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS idx_financial_ratios (
    id              BIGSERIAL    PRIMARY KEY,
    ticker          VARCHAR(10)  NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
    date            DATE         NOT NULL,
    -- Valuation Ratios
    per             NUMERIC(10,2),         -- Price to Earnings
    pbv             NUMERIC(10,2),         -- Price to Book Value
    ps              NUMERIC(10,2),         -- Price to Sales
    ev_ebitda       NUMERIC(10,2),
    -- Profitability Ratios
    roe             NUMERIC(10,4),         -- Return on Equity
    roa             NUMERIC(10,4),         -- Return on Assets
    npm             NUMERIC(10,4),         -- Net Profit Margin
    gpm             NUMERIC(10,4),         -- Gross Profit Margin
    -- Liquidity & Leverage
    current_ratio   NUMERIC(10,4),
    debt_to_equity  NUMERIC(10,4),
    -- Growth (YoY)
    revenue_growth  NUMERIC(10,4),
    earnings_growth NUMERIC(10,4),
    -- Dividend
    dividend_yield  NUMERIC(10,4),
    payout_ratio    NUMERIC(10,4),
    -- Market Data
    market_cap      BIGINT,
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ticker, date)
);

-- ─── TABLE: TECHNICAL INDICATORS ─────────────────────────────
CREATE TABLE IF NOT EXISTS idx_technical_indicators (
    id          BIGSERIAL    PRIMARY KEY,
    ticker      VARCHAR(10)  NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
    date        DATE         NOT NULL,
    -- Moving Averages
    sma_5       NUMERIC(14,2),
    sma_20      NUMERIC(14,2),
    sma_50      NUMERIC(14,2),
    sma_200     NUMERIC(14,2),
    ema_12      NUMERIC(14,2),
    ema_26      NUMERIC(14,2),
    -- Momentum
    rsi_14      NUMERIC(8,4),
    -- MACD
    macd        NUMERIC(14,4),
    macd_signal NUMERIC(14,4),
    macd_hist   NUMERIC(14,4),
    -- Bollinger Bands
    bb_upper    NUMERIC(14,2),
    bb_middle   NUMERIC(14,2),
    bb_lower    NUMERIC(14,2),
    -- Volume
    vol_sma_20  BIGINT,
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ticker, date)
);

-- ─── TABLE: DIVIDENDS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idx_dividends (
    id              BIGSERIAL    PRIMARY KEY,
    ticker          VARCHAR(10)  NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
    ex_date         DATE         NOT NULL,
    payment_date    DATE,
    amount          NUMERIC(14,4) NOT NULL,  -- Per saham, dalam rupiah
    type            VARCHAR(20),              -- 'final', 'interim'
    UNIQUE(ticker, ex_date)
);

-- ─── TABLE: FINANCIAL STATEMENTS ─────────────────────────────
CREATE TABLE IF NOT EXISTS idx_financials (
    id              BIGSERIAL   PRIMARY KEY,
    ticker          VARCHAR(10) NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
    period_type     VARCHAR(20) NOT NULL,  -- 'annual' atau 'quarterly'
    period_year     INTEGER     NOT NULL,
    period_quarter  INTEGER,               -- 1,2,3,4 (null jika annual)
    -- Income Statement
    revenue         BIGINT,
    gross_profit    BIGINT,
    operating_income BIGINT,
    net_income      BIGINT,
    ebitda          BIGINT,
    -- Balance Sheet
    total_assets    BIGINT,
    total_equity    BIGINT,
    total_debt      BIGINT,
    cash            BIGINT,
    -- Cash Flow
    operating_cf    BIGINT,
    investing_cf    BIGINT,
    financing_cf    BIGINT,
    capex           BIGINT,
    -- Per Share
    eps             NUMERIC(14,4),
    bvps            NUMERIC(14,4),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ticker, period_type, period_year, period_quarter)
);

-- ─── TABLE: INDEX CONSTITUENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS idx_index_constituents (
    id          BIGSERIAL    PRIMARY KEY,
    index_code  VARCHAR(20)  NOT NULL,
    ticker      VARCHAR(10)  NOT NULL REFERENCES idx_companies(ticker) ON DELETE CASCADE,
    weight      NUMERIC(8,4),             -- Bobot dalam indeks (%)
    effective_date DATE,
    UNIQUE(index_code, ticker)
);

-- ─── TABLE: ETL PIPELINE LOGS ────────────────────────────────
CREATE TABLE IF NOT EXISTS idx_etl_logs (
    id              BIGSERIAL    PRIMARY KEY,
    run_date        DATE,
    source          VARCHAR(50),           -- 'idx', 'yfinance', 'twelve_data'
    status          VARCHAR(20),           -- 'success', 'failed', 'partial'
    records_fetched INTEGER,
    records_stored  INTEGER,
    error_message   TEXT,
    execution_time  INTEGER,               -- milliseconds
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEX UNTUK PERFORMA QUERY ──────────────────────────────
CREATE INDEX idx_prices_ticker_date   ON idx_stock_prices(ticker, date DESC);
CREATE INDEX idx_prices_date          ON idx_stock_prices(date DESC);
CREATE INDEX idx_prices_volume        ON idx_stock_prices(volume DESC);
CREATE INDEX idx_companies_sector     ON idx_companies(sector);
CREATE INDEX idx_companies_board      ON idx_companies(board);
CREATE INDEX idx_ratios_per           ON idx_financial_ratios(per);
CREATE INDEX idx_ratios_pbv           ON idx_financial_ratios(pbv);
CREATE INDEX idx_ratios_roe           ON idx_financial_ratios(roe);
CREATE INDEX idx_ratios_market_cap    ON idx_financial_ratios(market_cap DESC);
CREATE INDEX idx_index_code_date      ON idx_index_prices(index_code, date DESC);
CREATE INDEX idx_constituents_index   ON idx_index_constituents(index_code);
CREATE INDEX idx_technical_ticker_date ON idx_technical_indicators(ticker, date DESC);
CREATE INDEX idx_technical_rsi        ON idx_technical_indicators(rsi_14);

-- Full-text search untuk nama perusahaan
CREATE INDEX idx_companies_name_trgm  ON idx_companies USING gin(name gin_trgm_ops);
CREATE INDEX idx_companies_ticker_trgm ON idx_companies USING gin(ticker gin_trgm_ops);

-- ─── ROW LEVEL SECURITY (Public Read) ────────────────────────
ALTER TABLE idx_stock_prices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_financial_ratios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_financials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_dividends           ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_index_prices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_technical_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE idx_index_constituents  ENABLE ROW LEVEL SECURITY;

-- Public read-only access
CREATE POLICY "Public read idx_stock_prices"     ON idx_stock_prices        FOR SELECT USING (true);
CREATE POLICY "Public read idx_companies"        ON idx_companies           FOR SELECT USING (true);
CREATE POLICY "Public read idx_financial_ratios" ON idx_financial_ratios    FOR SELECT USING (true);
CREATE POLICY "Public read idx_financials"       ON idx_financials          FOR SELECT USING (true);
CREATE POLICY "Public read idx_dividends"        ON idx_dividends           FOR SELECT USING (true);
CREATE POLICY "Public read idx_index_prices"     ON idx_index_prices        FOR SELECT USING (true);
CREATE POLICY "Public read idx_technical"        ON idx_technical_indicators FOR SELECT USING (true);
CREATE POLICY "Public read idx_constituents"     ON idx_index_constituents   FOR SELECT USING (true);

-- ─── USEFUL VIEWS ────────────────────────────────────────────

-- View: Latest snapshot untuk semua saham
CREATE OR REPLACE VIEW v_idx_latest_prices AS
SELECT DISTINCT ON (sp.ticker)
    sp.ticker,
    c.name,
    c.sector,
    c.sub_sector,
    c.board,
    sp.date,
    sp.open,
    sp.high,
    sp.low,
    sp.close,
    sp.volume,
    sp.value,
    fr.per,
    fr.pbv,
    fr.roe,
    fr.dividend_yield,
    fr.market_cap,
    -- Hitung change vs hari sebelumnya
    LAG(sp.close) OVER (PARTITION BY sp.ticker ORDER BY sp.date) AS prev_close,
    (sp.close - LAG(sp.close) OVER (PARTITION BY sp.ticker ORDER BY sp.date)) AS price_change,
    ((sp.close - LAG(sp.close) OVER (PARTITION BY sp.ticker ORDER BY sp.date)) / LAG(sp.close) OVER (PARTITION BY sp.ticker ORDER BY sp.date) * 100) AS price_change_pct
FROM idx_stock_prices sp
JOIN idx_companies c ON sp.ticker = c.ticker
LEFT JOIN idx_financial_ratios fr ON sp.ticker = fr.ticker 
    AND fr.date = (SELECT MAX(date) FROM idx_financial_ratios WHERE ticker = sp.ticker)
WHERE c.is_active = true
ORDER BY sp.ticker, sp.date DESC;

-- View: Screener fundamental
CREATE OR REPLACE VIEW v_idx_screener AS
SELECT
    c.ticker,
    c.name,
    c.sector,
    c.sub_sector,
    c.board,
    lp.close          AS price,
    lp.date           AS price_date,
    lp.price_change,
    lp.price_change_pct,
    fr.per,
    fr.pbv,
    fr.ps,
    fr.roe,
    fr.roa,
    fr.npm,
    fr.debt_to_equity AS der,
    fr.dividend_yield,
    fr.revenue_growth,
    fr.earnings_growth,
    fr.market_cap,
    ti.rsi_14,
    ti.macd,
    ti.sma_50,
    ti.sma_200,
    ti.bb_upper,
    ti.bb_lower
FROM idx_companies c
LEFT JOIN v_idx_latest_prices lp ON c.ticker = lp.ticker
LEFT JOIN idx_financial_ratios fr ON c.ticker = fr.ticker
    AND fr.date = (SELECT MAX(date) FROM idx_financial_ratios WHERE ticker = c.ticker)
LEFT JOIN idx_technical_indicators ti ON c.ticker = ti.ticker
    AND ti.date = (SELECT MAX(date) FROM idx_technical_indicators WHERE ticker = c.ticker)
WHERE c.is_active = true;

-- View: Index performance
CREATE OR REPLACE VIEW v_idx_index_performance AS
SELECT DISTINCT ON (ip.index_code)
    ip.index_code,
    ip.date,
    ip.open,
    ip.high,
    ip.low,
    ip.close,
    LAG(ip.close) OVER (PARTITION BY ip.index_code ORDER BY ip.date) AS prev_close,
    (ip.close - LAG(ip.close) OVER (PARTITION BY ip.index_code ORDER BY ip.date)) AS change,
    ((ip.close - LAG(ip.close) OVER (PARTITION BY ip.index_code ORDER BY ip.date)) / LAG(ip.close) OVER (PARTITION BY ip.index_code ORDER BY ip.date) * 100) AS change_pct
FROM idx_index_prices ip
ORDER BY ip.index_code, ip.date DESC;

-- ✅ Migration complete
COMMENT ON TABLE idx_companies IS 'IDX listed companies (958 emiten)';
COMMENT ON TABLE idx_stock_prices IS 'Daily OHLCV price data for all IDX stocks';
COMMENT ON TABLE idx_financial_ratios IS 'Financial ratios (PER, PBV, ROE, etc.)';
COMMENT ON TABLE idx_technical_indicators IS 'Technical indicators (RSI, MACD, SMA, BB, etc.)';
COMMENT ON TABLE idx_dividends IS 'Historical dividend data';
COMMENT ON TABLE idx_financials IS 'Financial statements (Income, Balance Sheet, Cash Flow)';
