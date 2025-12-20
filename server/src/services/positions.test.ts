import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { resetTestDb, closeTestDb, getTestDb } from '../test/db.js'

// Mock the database module before importing services
vi.mock('../db/database.js', async () => {
  const testDb = await import('../test/db.js')
  return {
    db: testDb.getTestDb(),
    closeDatabase: testDb.closeTestDb
  }
})

// Import services after mocking
import * as positionsService from './positions.js'
import * as accountsService from './accounts.js'
import * as watchlistsService from './watchlists.js'

describe('Positions Service', () => {
  beforeEach(() => {
    resetTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  // Helper to create account and symbol for tests
  function createAccountAndSymbol() {
    const db = getTestDb()
    const account = accountsService.createAccount({ name: 'Test Account', broker: 'Schwab' })
    db.exec(`INSERT INTO symbols (symbol, company_name, sector) VALUES ('AAPL', 'Apple Inc.', 'Technology')`)
    return { db, account }
  }

  describe('getAllPositions', () => {
    it('should return empty array when no positions exist', () => {
      const positions = positionsService.getAllPositions()
      expect(positions).toEqual([])
    })

    it('should return all positions sorted by symbol', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO symbols (symbol) VALUES ('MSFT'), ('GOOGL')`)
      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'MSFT', 50),
        (${account.id}, 'AAPL', 100),
        (${account.id}, 'GOOGL', 25)
      `)

      const positions = positionsService.getAllPositions()
      expect(positions).toHaveLength(3)
      expect(positions[0].symbol).toBe('AAPL')
      expect(positions[1].symbol).toBe('GOOGL')
      expect(positions[2].symbol).toBe('MSFT')
    })
  })

  describe('getPosition', () => {
    it('should return undefined for non-existent position', () => {
      const position = positionsService.getPosition(999)
      expect(position).toBeUndefined()
    })

    it('should return position by ID', () => {
      const { db, account } = createAccountAndSymbol()
      const result = db.prepare(`
        INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (?, 'AAPL', 100, 15000)
      `).run(account.id)

      const position = positionsService.getPosition(Number(result.lastInsertRowid))
      expect(position).toBeDefined()
      expect(position?.symbol).toBe('AAPL')
      expect(position?.shares).toBe(100)
      expect(position?.cost_basis).toBe(15000)
    })
  })

  describe('getPositionsByAccount', () => {
    it('should return empty array for account with no positions', () => {
      const account = accountsService.createAccount({ name: 'Empty Account' })
      const positions = positionsService.getPositionsByAccount(account.id)
      expect(positions).toEqual([])
    })

    it('should return all positions for an account', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO symbols (symbol) VALUES ('MSFT')`)
      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account.id}, 'MSFT', 50)
      `)

      const positions = positionsService.getPositionsByAccount(account.id)
      expect(positions).toHaveLength(2)
    })

    it('should not return positions from other accounts', () => {
      const { db, account } = createAccountAndSymbol()
      const account2 = accountsService.createAccount({ name: 'Second Account' })

      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account2.id}, 'AAPL', 50)
      `)

      const positions = positionsService.getPositionsByAccount(account.id)
      expect(positions).toHaveLength(1)
      expect(positions[0].shares).toBe(100)
    })
  })

  describe('getPositionsBySymbol', () => {
    it('should return empty array for symbol with no positions', () => {
      const { db } = createAccountAndSymbol()
      const positions = positionsService.getPositionsBySymbol('AAPL')
      expect(positions).toEqual([])
    })

    it('should return all positions for a symbol across accounts', () => {
      const { db, account } = createAccountAndSymbol()
      const account2 = accountsService.createAccount({ name: 'Second Account' })

      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account2.id}, 'AAPL', 50)
      `)

      const positions = positionsService.getPositionsBySymbol('AAPL')
      expect(positions).toHaveLength(2)
    })

    it('should normalize symbol case', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO positions (account_id, symbol, shares) VALUES (${account.id}, 'AAPL', 100)`)

      const positions = positionsService.getPositionsBySymbol('aapl')
      expect(positions).toHaveLength(1)
      expect(positions[0].symbol).toBe('AAPL')
    })
  })

  describe('getPositionByAccountAndSymbol', () => {
    it('should return undefined when position does not exist', () => {
      const account = accountsService.createAccount({ name: 'Test Account' })
      const position = positionsService.getPositionByAccountAndSymbol(account.id, 'AAPL')
      expect(position).toBeUndefined()
    })

    it('should return specific position', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (${account.id}, 'AAPL', 100, 15000)`)

      const position = positionsService.getPositionByAccountAndSymbol(account.id, 'AAPL')
      expect(position).toBeDefined()
      expect(position?.shares).toBe(100)
      expect(position?.cost_basis).toBe(15000)
    })
  })

  describe('upsertPosition', () => {
    it('should create new position', () => {
      const { account } = createAccountAndSymbol()

      const position = positionsService.upsertPosition({
        account_id: account.id,
        symbol: 'AAPL',
        shares: 100,
        cost_basis: 15000
      })

      expect(position).toBeDefined()
      expect(position.account_id).toBe(account.id)
      expect(position.symbol).toBe('AAPL')
      expect(position.shares).toBe(100)
      expect(position.cost_basis).toBe(15000)
    })

    it('should update existing position', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (${account.id}, 'AAPL', 100, 15000)`)

      const position = positionsService.upsertPosition({
        account_id: account.id,
        symbol: 'AAPL',
        shares: 150
      })

      expect(position.shares).toBe(150)
      // cost_basis should be preserved when not provided
      expect(position.cost_basis).toBe(15000)

      // Verify only one position exists
      const all = positionsService.getPositionsByAccount(account.id)
      expect(all).toHaveLength(1)
    })

    it('should normalize symbol case', () => {
      const { account } = createAccountAndSymbol()

      const position = positionsService.upsertPosition({
        account_id: account.id,
        symbol: 'aapl',
        shares: 100
      })

      expect(position.symbol).toBe('AAPL')
    })
  })

  describe('updatePosition', () => {
    it('should return undefined for non-existent position', () => {
      const result = positionsService.updatePosition(999, { shares: 100 })
      expect(result).toBeUndefined()
    })

    it('should update shares', () => {
      const { db, account } = createAccountAndSymbol()
      const result = db.prepare(`
        INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (?, 'AAPL', 100, 15000)
      `).run(account.id)
      const id = Number(result.lastInsertRowid)

      const updated = positionsService.updatePosition(id, { shares: 150 })

      expect(updated).toBeDefined()
      expect(updated?.shares).toBe(150)
      expect(updated?.cost_basis).toBe(15000) // unchanged
    })

    it('should update cost_basis', () => {
      const { db, account } = createAccountAndSymbol()
      const result = db.prepare(`
        INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (?, 'AAPL', 100, 15000)
      `).run(account.id)
      const id = Number(result.lastInsertRowid)

      const updated = positionsService.updatePosition(id, { cost_basis: 17500 })

      expect(updated?.shares).toBe(100) // unchanged
      expect(updated?.cost_basis).toBe(17500)
    })

    it('should update multiple fields', () => {
      const { db, account } = createAccountAndSymbol()
      const result = db.prepare(`
        INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (?, 'AAPL', 100, 15000)
      `).run(account.id)
      const id = Number(result.lastInsertRowid)

      const updated = positionsService.updatePosition(id, { shares: 200, cost_basis: 30000 })

      expect(updated?.shares).toBe(200)
      expect(updated?.cost_basis).toBe(30000)
    })
  })

  describe('deletePosition', () => {
    it('should return false for non-existent position', () => {
      const result = positionsService.deletePosition(999)
      expect(result).toBe(false)
    })

    it('should delete existing position', () => {
      const { db, account } = createAccountAndSymbol()
      const result = db.prepare(`
        INSERT INTO positions (account_id, symbol, shares) VALUES (?, 'AAPL', 100)
      `).run(account.id)
      const id = Number(result.lastInsertRowid)

      const deleted = positionsService.deletePosition(id)
      expect(deleted).toBe(true)

      const position = positionsService.getPosition(id)
      expect(position).toBeUndefined()
    })
  })

  describe('deletePositionsByAccount', () => {
    it('should return 0 when no positions to delete', () => {
      const account = accountsService.createAccount({ name: 'Empty Account' })
      const count = positionsService.deletePositionsByAccount(account.id)
      expect(count).toBe(0)
    })

    it('should delete all positions for an account', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO symbols (symbol) VALUES ('MSFT')`)
      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account.id}, 'MSFT', 50)
      `)

      const count = positionsService.deletePositionsByAccount(account.id)
      expect(count).toBe(2)

      const remaining = positionsService.getPositionsByAccount(account.id)
      expect(remaining).toEqual([])
    })

    it('should not affect positions from other accounts', () => {
      const { db, account } = createAccountAndSymbol()
      const account2 = accountsService.createAccount({ name: 'Second Account' })

      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account2.id}, 'AAPL', 50)
      `)

      positionsService.deletePositionsByAccount(account.id)

      const remaining = positionsService.getPositionsByAccount(account2.id)
      expect(remaining).toHaveLength(1)
    })
  })

  describe('getEnrichedPositions', () => {
    it('should return empty array when no positions exist', () => {
      const positions = positionsService.getEnrichedPositions()
      expect(positions).toEqual([])
    })

    it('should return positions with symbol details', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES (${account.id}, 'AAPL', 100, 15000)`)

      const positions = positionsService.getEnrichedPositions()
      expect(positions).toHaveLength(1)
      expect(positions[0].symbol).toBe('AAPL')
      expect(positions[0].company_name).toBe('Apple Inc.')
      expect(positions[0].sector).toBe('Technology')
    })

    it('should filter by account when accountId provided', () => {
      const { db, account } = createAccountAndSymbol()
      const account2 = accountsService.createAccount({ name: 'Second Account' })

      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account2.id}, 'AAPL', 50)
      `)

      const positions = positionsService.getEnrichedPositions(account.id)
      expect(positions).toHaveLength(1)
      expect(positions[0].shares).toBe(100)
    })
  })

  describe('getPositionSummary', () => {
    it('should return empty array when no positions exist', () => {
      const summary = positionsService.getPositionSummary()
      expect(summary).toEqual([])
    })

    it('should aggregate positions by symbol', () => {
      const { db, account } = createAccountAndSymbol()
      const account2 = accountsService.createAccount({ name: 'Second Account' })

      db.exec(`
        INSERT INTO positions (account_id, symbol, shares, cost_basis) VALUES
        (${account.id}, 'AAPL', 100, 15000),
        (${account2.id}, 'AAPL', 50, 8000)
      `)

      const summary = positionsService.getPositionSummary()
      expect(summary).toHaveLength(1)
      expect(summary[0].symbol).toBe('AAPL')
      expect(summary[0].total_shares).toBe(150)
      expect(summary[0].total_cost_basis).toBe(23000)
    })

    it('should include watchlist_ids', () => {
      const { db, account } = createAccountAndSymbol()
      const watchlist = watchlistsService.createWatchlist({ name: 'Test WL', source: 'seeking_alpha' })

      db.exec(`INSERT INTO positions (account_id, symbol, shares) VALUES (${account.id}, 'AAPL', 100)`)
      db.exec(`INSERT INTO watchlist_members (watchlist_id, symbol) VALUES (${watchlist.id}, 'AAPL')`)

      const summary = positionsService.getPositionSummary()
      expect(summary).toHaveLength(1)
      expect(summary[0].watchlist_ids).toEqual([watchlist.id])
    })

    it('should return empty watchlist_ids array when not in any watchlist', () => {
      const { db, account } = createAccountAndSymbol()
      db.exec(`INSERT INTO positions (account_id, symbol, shares) VALUES (${account.id}, 'AAPL', 100)`)

      const summary = positionsService.getPositionSummary()
      expect(summary[0].watchlist_ids).toEqual([])
    })
  })
})
