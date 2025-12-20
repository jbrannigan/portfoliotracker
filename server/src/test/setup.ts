import { beforeAll, afterAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create a test database for each test file
let testDb: Database.Database | null = null

export function getTestDb(): Database.Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Make sure setup runs first.')
  }
  return testDb
}

beforeAll(() => {
  // Create in-memory database for tests
  testDb = new Database(':memory:')
  testDb.pragma('foreign_keys = ON')

  // Read and execute schema
  const schemaPath = path.join(__dirname, '../db/schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')

  // Split by semicolon and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    try {
      testDb.exec(statement + ';')
    } catch (error) {
      // Skip view errors in test environment
      if (!statement.includes('CREATE VIEW')) {
        console.error('Failed to execute:', statement.slice(0, 50))
        throw error
      }
    }
  }
})

beforeEach(() => {
  if (!testDb) return

  // Clear all tables before each test
  const tables = ['quotes_cache', 'transactions', 'seeking_alpha_ratings', 'motley_fool_ratings', 'watchlist_members', 'positions', 'watchlists', 'accounts', 'symbols']

  for (const table of tables) {
    testDb.exec(`DELETE FROM ${table}`)
  }
})

afterAll(() => {
  if (testDb) {
    testDb.close()
    testDb = null
  }
})

// Helper to seed test data
export function seedTestData(db: Database.Database) {
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
}
