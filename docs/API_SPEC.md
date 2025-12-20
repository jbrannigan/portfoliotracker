# API Specification

## Overview

REST API served by Express.js on port 3001 (configurable via `PORT` env var).

Base URL: `http://localhost:3001/api`

---

## Health Check

### GET /api/health

Returns server status and database connectivity.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-12-17T16:00:00.000Z"
}
```

---

## Symbols

### GET /api/symbols

List all tracked symbols with latest quote data.

**Query Parameters:**
- `watchlist` (optional): Filter by watchlist ID
- `account` (optional): Filter to symbols held in account

**Response:**
```json
{
  "symbols": [
    {
      "symbol": "AAPL",
      "company_name": "Apple Inc",
      "sector": "Technology",
      "price": 195.50,
      "change": 2.30,
      "change_percent": 1.19,
      "watchlists": ["Alpha Picks", "Hidden Gems"],
      "total_shares": 150,
      "total_value": 29325.00
    }
  ]
}
```

### GET /api/symbols/:symbol

Get detailed position summary for a single symbol.

**Response:**
```json
{
  "symbol": "AAPL",
  "company_name": "Apple Inc",
  "sector": "Technology",
  
  "quote": {
    "price": 195.50,
    "change": 2.30,
    "change_percent": 1.19,
    "volume": 45000000,
    "high_52w": 199.62,
    "low_52w": 164.08,
    "market_cap": 3050000000000,
    "pe_ratio": 32.5,
    "dividend_yield": 0.51,
    "beta": 1.25,
    "fetched_at": "2025-12-17T16:00:00.000Z"
  },
  
  "positions": [
    {
      "account_id": 1,
      "account_name": "Jim's Roth IRA",
      "shares": 100,
      "cost_basis": 15000.00,
      "market_value": 19550.00,
      "gain_loss": 4550.00,
      "gain_loss_percent": 30.33
    },
    {
      "account_id": 2,
      "account_name": "TD Ameritrade IRA",
      "shares": 50,
      "cost_basis": 8000.00,
      "market_value": 9775.00,
      "gain_loss": 1775.00,
      "gain_loss_percent": 22.19
    }
  ],
  
  "total_shares": 150,
  "total_cost_basis": 23000.00,
  "total_market_value": 29325.00,
  "total_gain_loss": 6325.00,
  "total_gain_loss_percent": 27.50,
  
  "watchlists": [
    {
      "id": 1,
      "name": "Alpha Picks",
      "source": "seeking_alpha",
      "target_allocation": 2631.58,
      "actual_allocation": 29325.00
    }
  ],
  
  "ratings": {
    "seeking_alpha": {
      "quant_score": 4.85,
      "sa_analyst_score": 3.92,
      "wall_st_score": 4.29,
      "valuation_grade": "D+",
      "growth_grade": "A+",
      "profitability_grade": "A+",
      "momentum_grade": "B",
      "eps_revision_grade": "C+"
    },
    "motley_fool": {
      "quant_5y": 74.5,
      "rec_date": "2025-09-22",
      "cost_basis_at_rec": 150.00,
      "return_since_rec": 30.33,
      "allocation": 4.3,
      "risk_tag": "Moderate",
      "est_low_return": 5.0,
      "est_high_return": 25.0,
      "est_max_drawdown": -35.0
    }
  },
  
  "links": {
    "seeking_alpha": "https://seekingalpha.com/symbol/AAPL",
    "motley_fool": "https://www.fool.com/quote/nasdaq/aapl/"
  }
}
```

---

## Accounts

### GET /api/accounts

List all brokerage accounts.

**Response:**
```json
{
  "accounts": [
    {
      "id": 1,
      "name": "Jim's Roth IRA",
      "account_number_suffix": "207",
      "broker": "Schwab",
      "total_value": 525117.47,
      "total_cost_basis": 546538.74,
      "day_change": -7933.63,
      "position_count": 18
    }
  ]
}
```

### GET /api/accounts/:id

Get account details with all positions.

**Response:**
```json
{
  "id": 1,
  "name": "Jim's Roth IRA",
  "broker": "Schwab",
  "positions": [
    {
      "symbol": "ALL",
      "company_name": "ALLSTATE CORP",
      "shares": 200,
      "price": 209.08,
      "cost_basis": 40323.00,
      "market_value": 41816.00,
      "gain_loss": 1493.00,
      "gain_loss_percent": 3.7,
      "day_change": -86.00
    }
  ],
  "summary": {
    "total_value": 525117.47,
    "total_cost_basis": 546538.74,
    "total_gain_loss": -21421.27,
    "day_change": -7933.63
  }
}
```

### POST /api/accounts

Create a new account.

**Request:**
```json
{
  "name": "New IRA",
  "account_number_suffix": "123",
  "broker": "Schwab"
}
```

---

## Watchlists

### GET /api/watchlists

List all watchlists.

**Response:**
```json
{
  "watchlists": [
    {
      "id": 1,
      "name": "Alpha Picks",
      "source": "seeking_alpha",
      "dollar_allocation": 100000.00,
      "symbol_count": 38,
      "target_per_symbol": 2631.58
    }
  ]
}
```

### GET /api/watchlists/:id

Get watchlist details with members.

**Response:**
```json
{
  "id": 1,
  "name": "Alpha Picks",
  "source": "seeking_alpha",
  "dollar_allocation": 100000.00,
  "members": [
    {
      "symbol": "W",
      "company_name": "WAYFAIR INC",
      "added_at": "2025-01-15",
      "target_dollars": 2631.58,
      "actual_dollars": 30741.00,
      "variance": 28109.42
    }
  ]
}
```

### POST /api/watchlists

Create a new watchlist.

**Request:**
```json
{
  "name": "Hidden Gems",
  "source": "motley_fool",
  "dollar_allocation": 50000.00
}
```

### PATCH /api/watchlists/:id

Update watchlist allocation.

**Request:**
```json
{
  "dollar_allocation": 75000.00
}
```

---

## Import

### POST /api/import/schwab

Import positions from Schwab CSV export.

**Request (multipart/form-data):**
- `file`: CSV file

**Response:**
```json
{
  "success": true,
  "account": {
    "id": 1,
    "name": "Jim's Roth IRA",
    "created": false
  },
  "results": {
    "added": 5,
    "updated": 12,
    "unchanged": 1,
    "errors": []
  }
}
```

### POST /api/import/seeking-alpha

Import watchlist from Seeking Alpha Excel export.

**Request (multipart/form-data):**
- `file`: Excel file
- `watchlist_id`: ID of watchlist to update (or "new")
- `watchlist_name`: Name for new watchlist (if watchlist_id = "new")

**Response:**
```json
{
  "success": true,
  "watchlist": {
    "id": 1,
    "name": "Alpha Picks"
  },
  "results": {
    "symbols_added": 38,
    "ratings_updated": 38,
    "errors": []
  }
}
```

### POST /api/import/motley-fool

Import scorecard from Motley Fool CSV export.

**Request (multipart/form-data):**
- `file`: CSV file
- `watchlist_id`: ID of watchlist to update (or "new")
- `watchlist_name`: Name for new watchlist (if watchlist_id = "new")

---

## Transactions

### GET /api/transactions

List transactions with optional filters.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `account_id` (optional): Filter by account
- `type` (optional): "BUY" or "SELL"
- `from_date` (optional): Start date (ISO format)
- `to_date` (optional): End date (ISO format)
- `limit` (optional): Number of results (default 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "symbol": "AAPL",
      "company_name": "Apple Inc",
      "account_id": 1,
      "account_name": "Jim's Roth IRA",
      "transaction_type": "BUY",
      "shares": 100,
      "price_per_share": 150.00,
      "total_amount": 15000.00,
      "transaction_date": "2025-12-15",
      "reason_type": "watchlist_add",
      "reason_watchlist": "Alpha Picks",
      "reason_notes": "Added to SA Alpha Picks list",
      "reason_url": null,
      "created_at": "2025-12-15T10:00:00.000Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### POST /api/transactions

Log a new transaction.

**Request:**
```json
{
  "account_id": 1,
  "symbol": "AAPL",
  "transaction_type": "BUY",
  "shares": 100,
  "price_per_share": 150.00,
  "transaction_date": "2025-12-15",
  "reason_type": "watchlist_add",
  "reason_watchlist_id": 1,
  "reason_notes": "Added to SA Alpha Picks list",
  "reason_url": null
}
```

### GET /api/transactions/export

Export transactions as CSV or Excel.

**Query Parameters:**
- `format`: "csv" or "xlsx"
- Same filters as GET /api/transactions

**Response:** File download

---

## Quotes

### GET /api/quotes/:symbol

Get current quote for a symbol.

**Response:**
```json
{
  "symbol": "AAPL",
  "price": 195.50,
  "change": 2.30,
  "change_percent": 1.19,
  "volume": 45000000,
  "high_52w": 199.62,
  "low_52w": 164.08,
  "market_cap": 3050000000000,
  "pe_ratio": 32.5,
  "dividend_yield": 0.51,
  "beta": 1.25,
  "fetched_at": "2025-12-17T16:00:00.000Z",
  "cached": true
}
```

### POST /api/quotes/refresh

Force refresh quotes for specified symbols.

**Request:**
```json
{
  "symbols": ["AAPL", "GOOGL", "MSFT"]
}
```

**Note:** Subject to Alpha Vantage rate limits.

---

## Dashboard

### GET /api/dashboard

Get summary data for dashboard view.

**Response:**
```json
{
  "portfolio_summary": {
    "total_value": 3200000.00,
    "total_cost_basis": 2800000.00,
    "total_gain_loss": 400000.00,
    "day_change": -12500.00,
    "day_change_percent": -0.39
  },
  
  "accounts": [
    {
      "id": 1,
      "name": "Jim's Roth IRA",
      "total_value": 525117.47,
      "day_change": -7933.63
    }
  ],
  
  "watchlists": [
    {
      "id": 1,
      "name": "Alpha Picks",
      "return_since_inception": 15.2,
      "symbols_owned": 12,
      "symbols_total": 38
    }
  ],
  
  "top_gainers": [
    {"symbol": "SHOP", "gain_percent": 113.42}
  ],
  
  "top_losers": [
    {"symbol": "LRN", "gain_percent": -40.08}
  ],
  
  "recent_transactions": [
    {
      "id": 5,
      "symbol": "AAPL",
      "type": "BUY",
      "shares": 100,
      "date": "2025-12-15"
    }
  ],
  
  "rebalancing_needed": [
    {
      "symbol": "W",
      "watchlist": "Alpha Picks",
      "target": 2631.58,
      "actual": 30741.00,
      "variance_percent": 1068
    }
  ]
}
```

---

## Error Responses

All errors return a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid symbol format",
    "details": {
      "field": "symbol",
      "value": "invalid!symbol",
      "expected": "Alphanumeric with optional period"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| NOT_FOUND | 404 | Resource not found |
| IMPORT_ERROR | 400 | File import failed |
| RATE_LIMITED | 429 | Alpha Vantage rate limit |
| INTERNAL_ERROR | 500 | Server error |
