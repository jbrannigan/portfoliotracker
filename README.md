# Portfolio Tracker PWA

A local-first Progressive Web App for tracking investment positions across multiple brokerage accounts and watchlists, with consolidated ratings from Motley Fool and Seeking Alpha services.

**Current Status:** Backend 100% Complete | Frontend 30% Complete | Dashboard Live

📊 See [docs/PROGRESS.md](./docs/PROGRESS.md) for detailed implementation status
✅ See [docs/CHECKLIST_STATUS.md](./docs/CHECKLIST_STATUS.md) for phase-by-phase completion

## Project Overview

This application enables an investor to:
- Track actual positions across multiple Schwab brokerage accounts
- Manage watchlists from subscription services (Motley Fool, Seeking Alpha)
- Calculate target allocations based on equal-weighting within watchlists
- View consolidated ratings from multiple sources on a single position summary page
- Log buy/sell transactions with reasons and article references
- Get live quotes and performance stats via Alpha Vantage API

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        iPad (Primary)                          │
│                      PWA - React + Vite                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Position   │  │  Watchlist  │  │    Transaction Log      │ │
│  │  Summary    │  │  Manager    │  │    + Export             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Home Network (HTTP)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MacBook (Local Server)                       │
│                      Node.js + Express                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  API Proxy  │  │   SQLite    │  │   Import/Export         │ │
│  │  (Alpha V.) │  │   Database  │  │   CSV/Excel Handlers    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (outbound only)
                              ▼
                    ┌─────────────────┐
                    │  Alpha Vantage  │
                    │      API        │
                    └─────────────────┘
```

## Key Features

### 1. Position Summary Page (Per Symbol)
- **Merged ratings view**: Motley Fool + Seeking Alpha side-by-side
- **Account positions**: Shows shares held in each account + total
- **Watchlist membership**: Which watchlists include this symbol
- **Target vs Actual**: Per-watchlist target allocation vs actual holdings
- **Quick links**: Seeking Alpha page, Motley Fool page
- **Live data**: Current price, day change, performance metrics (from Alpha Vantage)

### 2. Watchlist Management
- Import watchlists from Seeking Alpha Excel exports
- Import scorecards from Motley Fool CSV exports
- Assign dollar allocation per watchlist (e.g., "$50,000 for Alpha Picks")
- Auto-calculate equal-weight target per position

### 3. Account Management
- Import positions from Schwab CSV exports
- Support multiple accounts with distinct names
- Track actual shares per symbol per account
- Aggregate positions across accounts

### 4. Transaction Log
- Log buys and sells with date, symbol, shares, price, account
- Structured reasons: "Added to watchlist", "Dropped from watchlist", "Rebalance"
- Free-form notes and article links
- Export to CSV or Excel

### 5. Dashboard / Overview
- Portfolio summary by account
- Performance by watchlist
- Positions needing rebalancing (actual vs target)
- Recent transactions

## Documentation

- **[Data Model](./docs/DATA_MODEL.md)** - Database schema and relationships
- **[Import Formats](./docs/IMPORT_FORMATS.md)** - CSV/Excel parsing specifications
- **[API Specification](./docs/API_SPEC.md)** - REST API endpoints and payloads
- **[UI Specification](./docs/UI_SPEC.md)** - Page layouts and component specs
- **[Setup Guide](./docs/SETUP.md)** - Detailed environment setup instructions

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- SQLite 3
- (Optional) Alpha Vantage API key for live quotes

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/portfoliotracker.git
cd portfoliotracker

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your Alpha Vantage API key (optional)
# ALPHA_VANTAGE_API_KEY=your_key_here
```

### Running the Application

```bash
# Start both server and client in development mode
npm run dev
```

**Access Points:**
- **Client (Dashboard):** http://localhost:5173
- **Server API:** http://localhost:3001
- **API Health:** http://localhost:3001/api/health

**Network Access (for iPad/mobile):**
- Find your local IP in the Vite startup output
- Access from other devices: http://YOUR_LOCAL_IP:5173

### What's Working Now

✅ **Backend (100% Complete):**
- REST API with 18+ endpoints
- SQLite database with 102 symbols, 70 positions, 3 accounts
- Schwab & Seeking Alpha import working
- Alpha Vantage integration with rate limiting
- Transaction logging with CSV/Excel export

✅ **Frontend (30% Complete):**
- Dashboard with real-time data
- Navigation between pages
- React Query data fetching
- Tailwind UI components

### Testing the API

```bash
# List all symbols
curl http://localhost:3001/api/symbols | jq .

# Get recent transactions
curl http://localhost:3001/api/transactions/recent | jq .

# Import Schwab CSV
curl -X POST http://localhost:3001/api/import/schwab \
  -F "file=@/Users/jimbrannigan/Public/Jim's Roth IRA-Positions-2025-12-17-164125.csv"

# Export transactions to CSV
curl "http://localhost:3001/api/transactions/export/csv" > transactions.csv
```

### Database Access

The SQLite database is automatically created at `./data/portfolio.db` on first run.

```bash
# Access the database
sqlite3 ./data/portfolio.db

# View tables
.tables

# Query examples
SELECT * FROM symbols LIMIT 5;
SELECT * FROM accounts;
SELECT * FROM positions;
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [TradingView](https://www.tradingview.com/) for embeddable financial charts
- [Alpha Vantage](https://www.alphavantage.co/) for market data API
- [shadcn/ui](https://ui.shadcn.com/) for React UI components
