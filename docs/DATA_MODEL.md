# Data Model Specification

## Overview

SQLite database with the following tables. All timestamps in ISO 8601 format.

---

## Core Tables

### `symbols`
Master list of all tracked symbols.

| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT PRIMARY KEY | Stock ticker (e.g., "AAPL", "BRK.B") |
| company_name | TEXT | Full company name |
| sector | TEXT | Industry sector |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**Notes:**
- Symbol is normalized (uppercase, "BRK/B" → "BRK.B")
- Company name populated from first import that includes it

---

### `accounts`
Brokerage accounts being tracked.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| name | TEXT UNIQUE NOT NULL | Display name (e.g., "Jim's Roth IRA") |
| account_number_suffix | TEXT | Last 3-4 digits for reference |
| broker | TEXT | "Schwab", "Fidelity", etc. |
| created_at | TEXT | ISO timestamp |

---

### `watchlists`
Subscription service watchlists.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| name | TEXT UNIQUE NOT NULL | Display name (e.g., "Alpha Picks", "Hidden Gems") |
| source | TEXT NOT NULL | "seeking_alpha" or "motley_fool" |
| dollar_allocation | REAL | Total $ allocated to this watchlist |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

### `positions`
Actual holdings in brokerage accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| account_id | INTEGER REFERENCES accounts(id) | Which account |
| symbol | TEXT REFERENCES symbols(symbol) | Stock ticker |
| shares | REAL NOT NULL | Number of shares held |
| cost_basis | REAL | Total cost basis in $ |
| updated_at | TEXT | ISO timestamp (from last import) |

**Unique constraint:** (account_id, symbol)

---

### `watchlist_members`
Which symbols belong to which watchlists.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| watchlist_id | INTEGER REFERENCES watchlists(id) | Which watchlist |
| symbol | TEXT REFERENCES symbols(symbol) | Stock ticker |
| added_at | TEXT | When added to watchlist |
| removed_at | TEXT NULL | When removed (NULL if still active) |

**Unique constraint:** (watchlist_id, symbol, added_at)

---

## Ratings Tables

### `motley_fool_ratings`
Ratings/metrics from Motley Fool scorecards.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| symbol | TEXT REFERENCES symbols(symbol) | Stock ticker |
| watchlist_id | INTEGER REFERENCES watchlists(id) | Which MF service |
| rec_date | TEXT | Original recommendation date |
| cost_basis | REAL | Price at recommendation |
| quant_5y | REAL | MF's 5-year quant score |
| allocation | REAL | MF's recommended allocation % |
| est_low_return | REAL | Estimated low return % |
| est_high_return | REAL | Estimated high return % |
| est_max_drawdown | REAL | Estimated max drawdown % |
| risk_tag | TEXT | "Aggressive", "Moderate", "Cautious" |
| times_recommended | INTEGER | How many times recommended |
| fcf_growth_1y | REAL | 1-year free cash flow growth % |
| gross_margin | REAL | Gross margin % |
| imported_at | TEXT | When this data was imported |

**Unique constraint:** (symbol, watchlist_id)

---

### `seeking_alpha_ratings`
Ratings from Seeking Alpha exports.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| symbol | TEXT REFERENCES symbols(symbol) | Stock ticker |
| watchlist_id | INTEGER REFERENCES watchlists(id) | Which SA service |
| quant_score | REAL | Quant rating (1-5 scale) |
| sa_analyst_score | REAL | SA Analyst rating (1-5) |
| wall_st_score | REAL | Wall Street rating (1-5) |
| valuation_grade | TEXT | Letter grade (A+ to F) |
| growth_grade | TEXT | Letter grade |
| profitability_grade | TEXT | Letter grade |
| momentum_grade | TEXT | Letter grade |
| eps_revision_grade | TEXT | Letter grade |
| imported_at | TEXT | When this data was imported |

**Unique constraint:** (symbol, watchlist_id)

---

## Transaction Log

### `transactions`
Buy/sell transaction history.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| account_id | INTEGER REFERENCES accounts(id) | Which account |
| symbol | TEXT REFERENCES symbols(symbol) | Stock ticker |
| transaction_type | TEXT NOT NULL | "BUY" or "SELL" |
| shares | REAL NOT NULL | Number of shares |
| price_per_share | REAL NOT NULL | Price per share |
| total_amount | REAL | Total transaction amount |
| transaction_date | TEXT NOT NULL | Date of transaction |
| reason_type | TEXT | "watchlist_add", "watchlist_drop", "rebalance", "other" |
| reason_watchlist_id | INTEGER REFERENCES watchlists(id) | Related watchlist (if applicable) |
| reason_notes | TEXT | Free-form notes |
| reason_url | TEXT | Link to article or source |
| created_at | TEXT | ISO timestamp |

---

## Cached Live Data

### `quotes_cache`
Cached price data from Alpha Vantage.

| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT PRIMARY KEY | Stock ticker |
| price | REAL | Current price |
| change | REAL | Day change $ |
| change_percent | REAL | Day change % |
| volume | INTEGER | Trading volume |
| high_52w | REAL | 52-week high |
| low_52w | REAL | 52-week low |
| market_cap | REAL | Market capitalization |
| pe_ratio | REAL | P/E ratio |
| dividend_yield | REAL | Dividend yield % |
| beta | REAL | Beta |
| fetched_at | TEXT | When data was fetched |

**Note:** Cache expires after configurable period (default: 15 minutes during market hours)

---

## Views (Computed)

### `v_position_summary`
Consolidated view for position summary page.

```sql
CREATE VIEW v_position_summary AS
SELECT 
    s.symbol,
    s.company_name,
    s.sector,
    -- Aggregate positions across accounts
    SUM(p.shares) as total_shares,
    SUM(p.cost_basis) as total_cost_basis,
    -- JSON array of account positions
    json_group_array(
        json_object(
            'account', a.name,
            'shares', p.shares,
            'cost_basis', p.cost_basis
        )
    ) as account_positions,
    -- Watchlist memberships (active only)
    (SELECT json_group_array(w.name) 
     FROM watchlist_members wm 
     JOIN watchlists w ON wm.watchlist_id = w.id 
     WHERE wm.symbol = s.symbol AND wm.removed_at IS NULL) as watchlists
FROM symbols s
LEFT JOIN positions p ON s.symbol = p.symbol
LEFT JOIN accounts a ON p.account_id = a.id
GROUP BY s.symbol;
```

### `v_target_allocations`
Calculated target allocations per watchlist.

```sql
CREATE VIEW v_target_allocations AS
SELECT 
    wm.symbol,
    w.name as watchlist_name,
    w.dollar_allocation,
    COUNT(*) OVER (PARTITION BY w.id) as symbols_in_watchlist,
    w.dollar_allocation / COUNT(*) OVER (PARTITION BY w.id) as target_dollars
FROM watchlist_members wm
JOIN watchlists w ON wm.watchlist_id = w.id
WHERE wm.removed_at IS NULL;
```

---

## Symbol Normalization Rules

| Input | Normalized |
|-------|------------|
| BRK/B | BRK.B |
| BRK.B | BRK.B |
| brk.b | BRK.B |
| GOOGL | GOOGL |

Normalization function:
1. Uppercase all characters
2. Replace "/" with "."
3. Trim whitespace
