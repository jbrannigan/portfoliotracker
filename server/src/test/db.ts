import Database from 'better-sqlite3'

let testDb: Database.Database | null = null

export function createTestDb(): Database.Database {
  // Create in-memory database for tests
  testDb = new Database(':memory:')

  // Create tables in proper order for foreign keys
  testDb.exec(`
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

    CREATE TABLE IF NOT EXISTS quotes_cache (
      symbol TEXT PRIMARY KEY REFERENCES symbols(symbol) ON DELETE CASCADE,
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
  `)

  // Enable foreign keys after table creation
  testDb.pragma('foreign_keys = ON')

  return testDb
}

export function getTestDb(): Database.Database {
  if (!testDb) {
    testDb = createTestDb()
  }
  return testDb
}

export function resetTestDb(): void {
  if (!testDb) return

  // Clear all tables
  const tables = [
    'quotes_cache',
    'transactions',
    'seeking_alpha_ratings',
    'motley_fool_ratings',
    'watchlist_members',
    'positions',
    'watchlists',
    'accounts',
    'symbols'
  ]

  for (const table of tables) {
    testDb.exec(`DELETE FROM ${table}`)
  }
}

export function closeTestDb(): void {
  if (testDb) {
    testDb.close()
    testDb = null
  }
}

// Seed test data
export function seedTestData(): void {
  const db = getTestDb()

  // Create test accounts
  db.exec(`
    INSERT INTO accounts (name, broker, account_number_suffix) VALUES
    ('Test Account 1', 'Schwab', '1234'),
    ('Test Account 2', 'Fidelity', '5678')
  `)

  // Create test symbols
  db.exec(`
    INSERT INTO symbols (symbol, company_name, sector) VALUES
    ('AAPL', 'Apple Inc.', 'Technology'),
    ('MSFT', 'Microsoft Corporation', 'Technology'),
    ('GOOGL', 'Alphabet Inc.', 'Technology')
  `)

  // Create test watchlists
  db.exec(`
    INSERT INTO watchlists (name, source, dollar_allocation) VALUES
    ('Test SA Watchlist', 'seeking_alpha', 10000),
    ('Test MF Watchlist', 'motley_fool', 15000)
  `)

  // Create test positions
  db.exec(`
    INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES
    (1, 'AAPL', 100, 15000),
    (1, 'MSFT', 50, 12500),
    (2, 'GOOGL', 25, 5000)
  `)

  // Create test watchlist members
  db.exec(`
    INSERT INTO watchlist_members (watchlist_id, symbol) VALUES
    (1, 'AAPL'),
    (1, 'MSFT'),
    (2, 'GOOGL')
  `)

  // Create test transactions
  db.exec(`
    INSERT INTO transactions (account_id, symbol, transaction_type, shares, price_per_share, total_amount, transaction_date) VALUES
    (1, 'AAPL', 'BUY', 100, 150, 15000, '2025-01-01'),
    (1, 'MSFT', 'BUY', 50, 250, 12500, '2025-01-02')
  `)

  // Create test quotes cache
  db.exec(`
    INSERT INTO quotes_cache (symbol, price, change, change_percent, fetched_at) VALUES
    ('AAPL', 175.50, 2.50, 1.45, datetime('now'))
  `)
}

// Export the test db as 'db' for mocking
export { testDb as db }
