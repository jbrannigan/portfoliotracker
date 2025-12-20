# Claude Code Implementation Checklist

## Overview

This checklist guides implementation of the Portfolio Tracker PWA. Each phase builds on the previous. Check off items as completed.

---

## Phase 0: Environment Setup

### Prerequisites
- [ ] macOS with Homebrew installed
- [ ] Node.js v20+ installed (`brew install node`)
- [ ] Git configured
- [ ] Alpha Vantage API key obtained (free at https://www.alphavantage.co/support/#api-key)

### Project Initialization
- [ ] Create project directory: `mkdir portfolio-tracker && cd portfolio-tracker`
- [ ] Initialize git: `git init`
- [ ] Create root `package.json` with workspaces (see SETUP.md)
- [ ] Create `server/` directory structure
- [ ] Create `client/` directory structure
- [ ] Create `shared/` directory structure
- [ ] Create `.env` file from `.env.example`
- [ ] Add `.gitignore`
- [ ] Run `npm install` to install all dependencies

### Verify Setup
- [ ] `npm run dev` starts both server and client
- [ ] Server accessible at http://localhost:3001
- [ ] Client accessible at http://localhost:5173
- [ ] API proxy works (client requests to /api/* reach server)

---

## Phase 1: Database & Core API

### Database Setup
- [ ] Create `server/src/db/schema.sql` with all table definitions
- [ ] Create `server/src/db/database.ts` - SQLite connection wrapper
- [ ] Create `server/src/db/migrate.ts` - Schema initialization
- [ ] Database auto-creates on first run
- [ ] Test: Tables created correctly

### Core Models
- [ ] Create `shared/src/types.ts` with all TypeScript interfaces
- [ ] Create `server/src/services/symbols.ts` - Symbol CRUD
- [ ] Create `server/src/services/accounts.ts` - Account CRUD
- [ ] Create `server/src/services/watchlists.ts` - Watchlist CRUD
- [ ] Create `server/src/services/positions.ts` - Position CRUD
- [ ] Symbol normalization function (uppercase, "/" → ".")

### Basic API Routes
- [ ] GET `/api/health` - Health check
- [ ] GET `/api/symbols` - List symbols
- [ ] GET `/api/symbols/:symbol` - Symbol detail
- [ ] GET `/api/accounts` - List accounts
- [ ] GET `/api/accounts/:id` - Account detail
- [ ] POST `/api/accounts` - Create account
- [ ] GET `/api/watchlists` - List watchlists
- [ ] GET `/api/watchlists/:id` - Watchlist detail
- [ ] POST `/api/watchlists` - Create watchlist
- [ ] PATCH `/api/watchlists/:id` - Update allocation

### Test API
- [ ] Test all endpoints with curl or Postman
- [ ] Error handling returns proper JSON
- [ ] Validation errors return 400 with details

---

## Phase 2: Import System

### Schwab Importer
- [ ] Create `server/src/importers/schwab.ts`
- [ ] Parse CSV header to extract account name
- [ ] Parse position rows with proper type conversion
- [ ] Handle currency parsing ($1,234.56 → 1234.56)
- [ ] Handle share quantity parsing (1,000.5 → 1000.5)
- [ ] Skip Cash and Total rows
- [ ] Upsert account if not exists
- [ ] Upsert positions (update on conflict)
- [ ] Return summary (added/updated counts)
- [ ] POST `/api/import/schwab` endpoint

### Seeking Alpha Importer
- [ ] Create `server/src/importers/seekingAlpha.ts`
- [ ] Handle Excel parsing with xlsx library
- [ ] Fallback to XML extraction if xlsx fails
- [ ] Parse Ratings sheet for scores and grades
- [ ] Create/update symbols
- [ ] Create/update watchlist members
- [ ] Create/update SA ratings
- [ ] POST `/api/import/seeking-alpha` endpoint

### Motley Fool Importer
- [ ] Create `server/src/importers/motleyFool.ts`
- [ ] Parse CSV with proper headers
- [ ] Extract MF-specific metrics
- [ ] Create/update symbols
- [ ] Create/update watchlist members
- [ ] Create/update MF ratings
- [ ] POST `/api/import/motley-fool` endpoint

### Test Imports
- [ ] Import sample Schwab CSV successfully
- [ ] Import sample SA Excel successfully
- [ ] Import sample MF CSV successfully
- [ ] Re-import updates existing data correctly
- [ ] Error handling for malformed files

---

## Phase 3: Alpha Vantage Integration

### Quote Service
- [ ] Create `server/src/services/quotes.ts`
- [ ] Implement GLOBAL_QUOTE API call
- [ ] Implement OVERVIEW API call (for fundamentals)
- [ ] Rate limiting (5/min, 25/day on free tier)
- [ ] Caching with configurable TTL
- [ ] Queue management for batch requests

### Quote API
- [ ] GET `/api/quotes/:symbol` - Get quote (from cache or API)
- [ ] POST `/api/quotes/refresh` - Force refresh
- [ ] Background refresh on stale cache

### Integration
- [ ] Symbol detail endpoint includes live quote
- [ ] Position list includes current prices
- [ ] Dashboard uses cached quotes

### Test Quotes
- [ ] Single quote fetch works
- [ ] Cache returns cached data within TTL
- [ ] Rate limiting prevents API overuse
- [ ] Graceful handling when API unavailable

---

## Phase 4: Transaction Log

### Transaction Service
- [ ] Create `server/src/services/transactions.ts`
- [ ] Create transaction
- [ ] List with filters (symbol, account, date range)
- [ ] Pagination support

### Transaction API
- [ ] GET `/api/transactions` - List with filters
- [ ] POST `/api/transactions` - Create transaction
- [ ] GET `/api/transactions/export` - Export CSV/Excel

### Export
- [ ] CSV export with proper formatting
- [ ] Excel export with xlsx library
- [ ] Filename includes date range

### Test Transactions
- [ ] Create transaction saves correctly
- [ ] Filters work as expected
- [ ] Pagination returns correct results
- [ ] CSV export downloads correctly
- [ ] Excel export downloads correctly

---

## Phase 5: Client Foundation

### Project Setup
- [ ] Vite + React configured
- [ ] TypeScript configured
- [ ] Tailwind CSS configured
- [ ] React Router configured
- [ ] React Query configured
- [ ] PWA plugin configured

### Base Components
- [ ] `Layout.tsx` - App shell with navigation
- [ ] `Card.tsx` - Container component
- [ ] `Button.tsx` - Button variants
- [ ] `Input.tsx` - Form input
- [ ] `Select.tsx` - Dropdown
- [ ] `Table.tsx` - Data table
- [ ] `Modal.tsx` - Dialog
- [ ] `Spinner.tsx` - Loading indicator
- [ ] `Alert.tsx` - Messages

### Utility Components
- [ ] `PriceDisplay.tsx` - Formatted price
- [ ] `ChangeDisplay.tsx` - +/- with color
- [ ] `RatingDot.tsx` - Color-coded rating
- [ ] `PercentBar.tsx` - 52-week range visualization

### API Client
- [ ] Create `client/src/services/api.ts`
- [ ] Typed fetch wrapper
- [ ] Error handling
- [ ] React Query hooks for each endpoint

---

## Phase 6: Client Pages

### Dashboard
- [ ] `pages/Dashboard.tsx`
- [ ] Portfolio summary cards
- [ ] Account list with values
- [ ] Watchlist performance
- [ ] Top movers (gainers/losers)
- [ ] Rebalancing alerts
- [ ] Recent transactions

### Position List
- [ ] `pages/PositionList.tsx`
- [ ] Search by symbol/company
- [ ] Filter by watchlist, account, sector
- [ ] Sortable columns
- [ ] Rating indicators
- [ ] Click to navigate to detail

### Position Detail
- [ ] `pages/PositionDetail.tsx`
- [ ] Header with price and links
- [ ] 52-week range visualization
- [ ] Per-account position table
- [ ] Watchlist membership with targets
- [ ] Side-by-side ratings (SA + MF)
- [ ] Log transaction button

### Accounts
- [ ] `pages/AccountList.tsx`
- [ ] `pages/AccountDetail.tsx`
- [ ] Position list within account
- [ ] Account summary

### Watchlists
- [ ] `pages/WatchlistList.tsx`
- [ ] `pages/WatchlistDetail.tsx`
- [ ] Member list with targets
- [ ] Edit allocation

### Transaction Log
- [ ] `pages/TransactionLog.tsx`
- [ ] Filter controls
- [ ] Transaction table
- [ ] New transaction modal
- [ ] Export buttons

### Import Wizard
- [ ] `pages/Import.tsx`
- [ ] Source selection step
- [ ] File upload step
- [ ] Preview step
- [ ] Result summary

---

## Phase 7: PWA & Polish

### PWA Features
- [ ] Manifest configured correctly
- [ ] App icons (192x192, 512x512)
- [ ] Service worker caches assets
- [ ] Offline indicator
- [ ] "Add to Home Screen" works on iPad

### iPad Optimization
- [ ] Touch targets ≥44px
- [ ] Responsive at 768-1024px viewport
- [ ] Tables scroll horizontally on narrow views
- [ ] No hover-dependent interactions

### External Links
- [ ] Seeking Alpha link: `https://seekingalpha.com/symbol/{SYMBOL}`
- [ ] Motley Fool link: `https://www.fool.com/quote/nasdaq/{symbol}/` (lowercase)
- [ ] Links open in new tab/Safari

### Error Handling
- [ ] API errors show user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Form validation feedback
- [ ] Loading states everywhere

### Final Testing
- [ ] Full workflow: Import → View → Log → Export
- [ ] Test on iPad Safari
- [ ] Test on Mac Chrome
- [ ] Test PWA installation
- [ ] Test offline behavior

---

## Phase 8: Documentation & Deployment

### Documentation
- [ ] Update README with final instructions
- [ ] Document any deviations from spec
- [ ] Add troubleshooting section
- [ ] Create sample data for testing

### Local Network Access
- [ ] Server listens on 0.0.0.0
- [ ] Document firewall settings
- [ ] Document finding Mac IP address
- [ ] Test iPad → Mac connection

### Backup Strategy
- [ ] Document database backup procedure
- [ ] Create backup script
- [ ] Test restore from backup

### Final Checklist
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] README complete
- [ ] Git history clean

---

## Quick Reference

### Start Development
```bash
cd portfolio-tracker
npm run dev
```

### Import Test Data
```bash
# Via curl
curl -X POST http://localhost:3001/api/import/schwab \
  -F "file=@/path/to/positions.csv"
```

### Access from iPad
```bash
# Find Mac IP
ipconfig getifaddr en0

# Access on iPad
http://<mac-ip>:5173
```

### Database Access
```bash
sqlite3 ./data/portfolio.db
.tables
.schema symbols
SELECT * FROM symbols LIMIT 5;
```

---

## Files to Create (Summary)

```
portfolio-tracker/
├── package.json
├── .env
├── .gitignore
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── routes/
│       │   ├── symbols.ts
│       │   ├── accounts.ts
│       │   ├── watchlists.ts
│       │   ├── transactions.ts
│       │   ├── quotes.ts
│       │   └── import.ts
│       ├── services/
│       │   ├── symbols.ts
│       │   ├── accounts.ts
│       │   ├── watchlists.ts
│       │   ├── positions.ts
│       │   ├── transactions.ts
│       │   └── quotes.ts
│       ├── importers/
│       │   ├── schwab.ts
│       │   ├── seekingAlpha.ts
│       │   └── motleyFool.ts
│       ├── db/
│       │   ├── database.ts
│       │   ├── schema.sql
│       │   └── migrate.ts
│       └── types/
│           └── index.ts
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Card.tsx
│       │   ├── Button.tsx
│       │   └── ...
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── PositionList.tsx
│       │   ├── PositionDetail.tsx
│       │   └── ...
│       ├── hooks/
│       │   └── useApi.ts
│       └── services/
│           └── api.ts
└── shared/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types.ts
        └── utils.ts
```
