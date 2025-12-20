-- Portfolio Tracker Database Schema
-- SQLite database for tracking investment positions and ratings

-- Core Tables

CREATE TABLE IF NOT EXISTS symbols (
    symbol TEXT PRIMARY KEY,
    company_name TEXT,
    sector TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    account_number_suffix TEXT,
    broker TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('seeking_alpha', 'motley_fool')),
    dollar_allocation REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    shares REAL NOT NULL,
    cost_basis REAL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_id, symbol)
);

CREATE TABLE IF NOT EXISTS watchlist_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    removed_at TEXT,
    UNIQUE(watchlist_id, symbol, added_at)
);

-- Ratings Tables

CREATE TABLE IF NOT EXISTS motley_fool_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    rec_date TEXT,
    cost_basis REAL,
    quant_5y REAL,
    allocation REAL,
    est_low_return REAL,
    est_high_return REAL,
    est_max_drawdown REAL,
    risk_tag TEXT CHECK (risk_tag IN ('Aggressive', 'Moderate', 'Cautious')),
    times_recommended INTEGER,
    fcf_growth_1y REAL,
    gross_margin REAL,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, watchlist_id)
);

CREATE TABLE IF NOT EXISTS seeking_alpha_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    quant_score REAL,
    sa_analyst_score REAL,
    wall_st_score REAL,
    valuation_grade TEXT,
    growth_grade TEXT,
    profitability_grade TEXT,
    momentum_grade TEXT,
    eps_revision_grade TEXT,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(symbol, watchlist_id)
);

-- Transaction Log

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    shares REAL NOT NULL,
    price_per_share REAL NOT NULL,
    total_amount REAL,
    transaction_date TEXT NOT NULL,
    reason_type TEXT CHECK (reason_type IN ('watchlist_add', 'watchlist_drop', 'rebalance', 'other')),
    reason_watchlist_id INTEGER REFERENCES watchlists(id) ON DELETE SET NULL,
    reason_notes TEXT,
    reason_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cached Live Data

CREATE TABLE IF NOT EXISTS quotes_cache (
    symbol TEXT PRIMARY KEY REFERENCES symbols(symbol) ON DELETE CASCADE,
    exchange TEXT,
    price REAL,
    change REAL,
    change_percent REAL,
    volume INTEGER,
    high_52w REAL,
    low_52w REAL,
    market_cap REAL,
    pe_ratio REAL,
    dividend_yield REAL,
    beta REAL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Migration: Add exchange column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- This will fail silently if the column already exists

-- Indexes for common queries

CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(account_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_members_watchlist ON watchlist_members(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_members_symbol ON watchlist_members(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_members_active ON watchlist_members(removed_at) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_motley_fool_ratings_symbol ON motley_fool_ratings(symbol);
CREATE INDEX IF NOT EXISTS idx_seeking_alpha_ratings_symbol ON seeking_alpha_ratings(symbol);

-- Views

CREATE VIEW IF NOT EXISTS v_position_summary AS
SELECT
    s.symbol,
    s.company_name,
    s.sector,
    SUM(p.shares) as total_shares,
    SUM(p.cost_basis) as total_cost_basis,
    json_group_array(
        json_object(
            'account', a.name,
            'shares', p.shares,
            'cost_basis', p.cost_basis
        )
    ) as account_positions,
    (SELECT json_group_array(w.name)
     FROM watchlist_members wm
     JOIN watchlists w ON wm.watchlist_id = w.id
     WHERE wm.symbol = s.symbol AND wm.removed_at IS NULL) as watchlists
FROM symbols s
LEFT JOIN positions p ON s.symbol = p.symbol
LEFT JOIN accounts a ON p.account_id = a.id
GROUP BY s.symbol;

CREATE VIEW IF NOT EXISTS v_target_allocations AS
SELECT
    wm.symbol,
    w.name as watchlist_name,
    w.dollar_allocation,
    COUNT(*) OVER (PARTITION BY w.id) as symbols_in_watchlist,
    w.dollar_allocation / COUNT(*) OVER (PARTITION BY w.id) as target_dollars
FROM watchlist_members wm
JOIN watchlists w ON wm.watchlist_id = w.id
WHERE wm.removed_at IS NULL;
