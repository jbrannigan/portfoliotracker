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
import * as adminService from './admin.js'
import * as accountsService from './accounts.js'
import * as watchlistsService from './watchlists.js'

describe('Admin Service', () => {
  beforeEach(() => {
    resetTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  describe('getStats', () => {
    it('should return zeros when database is empty', () => {
      const stats = adminService.getStats()
      expect(stats.orphanSymbols).toBe(0)
      expect(stats.transactions).toBe(0)
      expect(stats.quotesCache).toBe(0)
      expect(stats.removedMembers).toBe(0)
    })

    it('should count orphan symbols', () => {
      const db = getTestDb()
      // Create symbols with no positions or watchlist membership
      db.exec(`
        INSERT INTO symbols (symbol) VALUES ('ORPHAN1'), ('ORPHAN2');
      `)

      const stats = adminService.getStats()
      expect(stats.orphanSymbols).toBe(2)
    })

    it('should not count symbols with positions as orphans', () => {
      const db = getTestDb()
      const account = accountsService.createAccount({ name: 'Test Account' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`INSERT INTO positions (account_id, symbol, shares) VALUES (${account.id}, 'AAPL', 100)`)

      const stats = adminService.getStats()
      expect(stats.orphanSymbols).toBe(0)
    })

    it('should not count symbols with watchlist membership as orphans', () => {
      const db = getTestDb()
      const watchlist = watchlistsService.createWatchlist({ name: 'Test WL', source: 'seeking_alpha' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('MSFT')`)
      db.exec(`INSERT INTO watchlist_members (watchlist_id, symbol) VALUES (${watchlist.id}, 'MSFT')`)

      const stats = adminService.getStats()
      expect(stats.orphanSymbols).toBe(0)
    })

    it('should count transactions', () => {
      const db = getTestDb()
      const account = accountsService.createAccount({ name: 'Test Account' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`
        INSERT INTO transactions (account_id, symbol, transaction_type, shares, price_per_share, transaction_date) VALUES
        (${account.id}, 'AAPL', 'BUY', 100, 150, '2025-01-01'),
        (${account.id}, 'AAPL', 'BUY', 50, 155, '2025-01-02')
      `)

      const stats = adminService.getStats()
      expect(stats.transactions).toBe(2)
    })

    it('should count quotes cache', () => {
      const db = getTestDb()
      db.exec(`
        INSERT INTO symbols (symbol) VALUES ('AAPL'), ('MSFT');
        INSERT INTO quotes_cache (symbol, price, fetched_at) VALUES
        ('AAPL', 175, datetime('now')),
        ('MSFT', 380, datetime('now'));
      `)

      const stats = adminService.getStats()
      expect(stats.quotesCache).toBe(2)
    })

    it('should count removed members', () => {
      const db = getTestDb()
      const watchlist = watchlistsService.createWatchlist({ name: 'Test WL', source: 'seeking_alpha' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`
        INSERT INTO watchlist_members (watchlist_id, symbol, removed_at) VALUES
        (${watchlist.id}, 'AAPL', datetime('now'))
      `)

      const stats = adminService.getStats()
      expect(stats.removedMembers).toBe(1)
    })
  })

  describe('deleteOrphanSymbols', () => {
    it('should delete orphan symbols', () => {
      const db = getTestDb()
      db.exec(`INSERT INTO symbols (symbol) VALUES ('ORPHAN1'), ('ORPHAN2');`)

      const result = adminService.deleteOrphanSymbols()
      expect(result.success).toBe(true)
      expect(result.deleted).toBe(2)

      const remaining = db.prepare('SELECT COUNT(*) as count FROM symbols').get() as { count: number }
      expect(remaining.count).toBe(0)
    })

    it('should not delete symbols with positions', () => {
      const db = getTestDb()
      const account = accountsService.createAccount({ name: 'Test Account' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL'), ('ORPHAN')`)
      db.exec(`INSERT INTO positions (account_id, symbol, shares) VALUES (${account.id}, 'AAPL', 100)`)

      const result = adminService.deleteOrphanSymbols()
      expect(result.deleted).toBe(1)

      const remaining = db.prepare('SELECT symbol FROM symbols').all() as { symbol: string }[]
      expect(remaining.map(r => r.symbol)).toContain('AAPL')
    })
  })

  describe('clearTransactions', () => {
    it('should clear all transactions', () => {
      const db = getTestDb()
      const account = accountsService.createAccount({ name: 'Test Account' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`
        INSERT INTO transactions (account_id, symbol, transaction_type, shares, price_per_share, transaction_date) VALUES
        (${account.id}, 'AAPL', 'BUY', 100, 150, '2025-01-01'),
        (${account.id}, 'AAPL', 'SELL', 50, 175, '2025-01-02')
      `)

      const result = adminService.clearTransactions()
      expect(result.success).toBe(true)
      expect(result.deleted).toBe(2)

      const remaining = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number }
      expect(remaining.count).toBe(0)
    })
  })

  describe('clearQuotesCache', () => {
    it('should clear all cached quotes', () => {
      const db = getTestDb()
      db.exec(`
        INSERT INTO symbols (symbol) VALUES ('AAPL'), ('MSFT');
        INSERT INTO quotes_cache (symbol, price, fetched_at) VALUES
        ('AAPL', 175, datetime('now')),
        ('MSFT', 380, datetime('now'));
      `)

      const result = adminService.clearQuotesCache()
      expect(result.success).toBe(true)
      expect(result.deleted).toBe(2)

      const remaining = db.prepare('SELECT COUNT(*) as count FROM quotes_cache').get() as { count: number }
      expect(remaining.count).toBe(0)
    })
  })

  describe('purgeRemovedMembers', () => {
    it('should purge soft-deleted members', () => {
      const db = getTestDb()
      const watchlist = watchlistsService.createWatchlist({ name: 'Test WL', source: 'seeking_alpha' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL'), ('MSFT')`)
      db.exec(`
        INSERT INTO watchlist_members (watchlist_id, symbol, removed_at) VALUES
        (${watchlist.id}, 'AAPL', datetime('now'))
      `)
      db.exec(`INSERT INTO watchlist_members (watchlist_id, symbol) VALUES (${watchlist.id}, 'MSFT')`)

      const result = adminService.purgeRemovedMembers()
      expect(result.success).toBe(true)
      expect(result.deleted).toBe(1)

      const remaining = db.prepare('SELECT COUNT(*) as count FROM watchlist_members').get() as { count: number }
      expect(remaining.count).toBe(1)
    })
  })

  describe('deleteAccountWithCounts', () => {
    it('should return null for non-existent account', () => {
      const result = adminService.deleteAccountWithCounts(999)
      expect(result).toBeNull()
    })

    it('should delete account and return counts', () => {
      const db = getTestDb()
      const account = accountsService.createAccount({ name: 'Account To Delete' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL'), ('MSFT')`)
      db.exec(`
        INSERT INTO positions (account_id, symbol, shares) VALUES
        (${account.id}, 'AAPL', 100),
        (${account.id}, 'MSFT', 50)
      `)

      const result = adminService.deleteAccountWithCounts(account.id)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.deleted.account).toBe('Account To Delete')
      expect(result?.deleted.positions).toBe(2)

      const accountCheck = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id)
      expect(accountCheck).toBeUndefined()
    })
  })

  describe('deleteWatchlistWithCounts', () => {
    it('should return null for non-existent watchlist', () => {
      const result = adminService.deleteWatchlistWithCounts(999)
      expect(result).toBeNull()
    })

    it('should delete watchlist and return counts', () => {
      const db = getTestDb()
      const watchlist = watchlistsService.createWatchlist({ name: 'WL To Delete', source: 'seeking_alpha' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL'), ('MSFT')`)
      db.exec(`
        INSERT INTO watchlist_members (watchlist_id, symbol) VALUES
        (${watchlist.id}, 'AAPL'),
        (${watchlist.id}, 'MSFT')
      `)
      db.exec(`
        INSERT INTO seeking_alpha_ratings (watchlist_id, symbol, quant_score) VALUES
        (${watchlist.id}, 'AAPL', 4.5),
        (${watchlist.id}, 'MSFT', 4.8)
      `)

      const result = adminService.deleteWatchlistWithCounts(watchlist.id)
      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.deleted.watchlist).toBe('WL To Delete')
      expect(result?.deleted.members).toBe(2)
      expect(result?.deleted.ratings).toBe(2)
    })
  })

  describe('removeSymbolFromWatchlist', () => {
    it('should return null for non-existent watchlist', () => {
      const result = adminService.removeSymbolFromWatchlist(999, 'AAPL')
      expect(result).toBeNull()
    })

    it('should return null for non-existent member', () => {
      const watchlist = watchlistsService.createWatchlist({ name: 'Test WL', source: 'seeking_alpha' })

      const result = adminService.removeSymbolFromWatchlist(watchlist.id, 'NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should soft delete member', () => {
      const db = getTestDb()
      const watchlist = watchlistsService.createWatchlist({ name: 'Test WL', source: 'seeking_alpha' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`INSERT INTO watchlist_members (watchlist_id, symbol) VALUES (${watchlist.id}, 'AAPL')`)

      const result = adminService.removeSymbolFromWatchlist(watchlist.id, 'AAPL')
      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.removed.symbol).toBe('AAPL')
      expect(result?.removed.watchlist).toBe('Test WL')

      // Check it's soft deleted (removed_at set)
      const member = db.prepare('SELECT removed_at FROM watchlist_members WHERE watchlist_id = ? AND symbol = ?').get(watchlist.id, 'AAPL') as { removed_at: string }
      expect(member.removed_at).not.toBeNull()
    })
  })
})
