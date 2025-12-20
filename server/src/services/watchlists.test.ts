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
import * as watchlistsService from './watchlists.js'

describe('Watchlists Service', () => {
  beforeEach(() => {
    resetTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  describe('getAllWatchlists', () => {
    it('should return empty array when no watchlists exist', () => {
      const watchlists = watchlistsService.getAllWatchlists()
      expect(watchlists).toEqual([])
    })

    it('should return all watchlists sorted by name', () => {
      watchlistsService.createWatchlist({ name: 'Zebra List', source: 'seeking_alpha' })
      watchlistsService.createWatchlist({ name: 'Alpha List', source: 'motley_fool' })

      const watchlists = watchlistsService.getAllWatchlists()
      expect(watchlists).toHaveLength(2)
      expect(watchlists[0].name).toBe('Alpha List')
      expect(watchlists[1].name).toBe('Zebra List')
    })
  })

  describe('getWatchlist', () => {
    it('should return undefined for non-existent watchlist', () => {
      const watchlist = watchlistsService.getWatchlist(999)
      expect(watchlist).toBeUndefined()
    })

    it('should return watchlist by ID', () => {
      const created = watchlistsService.createWatchlist({
        name: 'Test Watchlist',
        source: 'seeking_alpha',
        dollar_allocation: 10000
      })

      const watchlist = watchlistsService.getWatchlist(created.id)
      expect(watchlist).toBeDefined()
      expect(watchlist?.name).toBe('Test Watchlist')
      expect(watchlist?.source).toBe('seeking_alpha')
      expect(watchlist?.dollar_allocation).toBe(10000)
    })
  })

  describe('createWatchlist', () => {
    it('should create watchlist with required fields', () => {
      const watchlist = watchlistsService.createWatchlist({
        name: 'New Watchlist',
        source: 'seeking_alpha'
      })

      expect(watchlist).toBeDefined()
      expect(watchlist.id).toBeGreaterThan(0)
      expect(watchlist.name).toBe('New Watchlist')
      expect(watchlist.source).toBe('seeking_alpha')
      expect(watchlist.dollar_allocation).toBeNull()
    })

    it('should create watchlist with allocation', () => {
      const watchlist = watchlistsService.createWatchlist({
        name: 'Allocated Watchlist',
        source: 'motley_fool',
        dollar_allocation: 25000
      })

      expect(watchlist.dollar_allocation).toBe(25000)
    })

    it('should throw on duplicate name', () => {
      watchlistsService.createWatchlist({ name: 'Duplicate', source: 'seeking_alpha' })

      expect(() => {
        watchlistsService.createWatchlist({ name: 'Duplicate', source: 'motley_fool' })
      }).toThrow()
    })
  })

  describe('updateWatchlist', () => {
    it('should return undefined for non-existent watchlist', () => {
      const result = watchlistsService.updateWatchlist(999, { name: 'Updated' })
      expect(result).toBeUndefined()
    })

    it('should update watchlist name', () => {
      const created = watchlistsService.createWatchlist({ name: 'Original', source: 'seeking_alpha' })

      const updated = watchlistsService.updateWatchlist(created.id, { name: 'Updated' })

      expect(updated).toBeDefined()
      expect(updated?.name).toBe('Updated')
    })

    it('should update dollar allocation', () => {
      const created = watchlistsService.createWatchlist({
        name: 'Watchlist',
        source: 'seeking_alpha',
        dollar_allocation: 10000
      })

      const updated = watchlistsService.updateWatchlist(created.id, { dollar_allocation: 20000 })

      expect(updated?.dollar_allocation).toBe(20000)
    })
  })

  describe('deleteWatchlist', () => {
    it('should return false for non-existent watchlist', () => {
      const result = watchlistsService.deleteWatchlist(999)
      expect(result).toBe(false)
    })

    it('should delete existing watchlist', () => {
      const created = watchlistsService.createWatchlist({ name: 'To Delete', source: 'seeking_alpha' })

      const result = watchlistsService.deleteWatchlist(created.id)
      expect(result).toBe(true)

      const watchlist = watchlistsService.getWatchlist(created.id)
      expect(watchlist).toBeUndefined()
    })

    it('should cascade delete members and ratings', () => {
      const db = getTestDb()
      const created = watchlistsService.createWatchlist({ name: 'Watchlist With Members', source: 'seeking_alpha' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`INSERT INTO watchlist_members (watchlist_id, symbol) VALUES (${created.id}, 'AAPL')`)
      db.exec(`INSERT INTO seeking_alpha_ratings (watchlist_id, symbol, quant_score) VALUES (${created.id}, 'AAPL', 4.5)`)

      const membersBefore = db.prepare('SELECT COUNT(*) as count FROM watchlist_members').get() as { count: number }
      const ratingsBefore = db.prepare('SELECT COUNT(*) as count FROM seeking_alpha_ratings').get() as { count: number }
      expect(membersBefore.count).toBe(1)
      expect(ratingsBefore.count).toBe(1)

      watchlistsService.deleteWatchlist(created.id)

      const membersAfter = db.prepare('SELECT COUNT(*) as count FROM watchlist_members').get() as { count: number }
      const ratingsAfter = db.prepare('SELECT COUNT(*) as count FROM seeking_alpha_ratings').get() as { count: number }
      expect(membersAfter.count).toBe(0)
      expect(ratingsAfter.count).toBe(0)
    })
  })

  describe('getWatchlistsBySource', () => {
    it('should filter by seeking_alpha source', () => {
      watchlistsService.createWatchlist({ name: 'SA List 1', source: 'seeking_alpha' })
      watchlistsService.createWatchlist({ name: 'SA List 2', source: 'seeking_alpha' })
      watchlistsService.createWatchlist({ name: 'MF List', source: 'motley_fool' })

      const watchlists = watchlistsService.getWatchlistsBySource('seeking_alpha')
      expect(watchlists).toHaveLength(2)
      expect(watchlists.every(w => w.source === 'seeking_alpha')).toBe(true)
    })

    it('should filter by motley_fool source', () => {
      watchlistsService.createWatchlist({ name: 'SA List', source: 'seeking_alpha' })
      watchlistsService.createWatchlist({ name: 'MF List 1', source: 'motley_fool' })
      watchlistsService.createWatchlist({ name: 'MF List 2', source: 'motley_fool' })

      const watchlists = watchlistsService.getWatchlistsBySource('motley_fool')
      expect(watchlists).toHaveLength(2)
      expect(watchlists.every(w => w.source === 'motley_fool')).toBe(true)
    })
  })

  describe('getWatchlistByName', () => {
    it('should return undefined for non-existent name', () => {
      const watchlist = watchlistsService.getWatchlistByName('NonExistent')
      expect(watchlist).toBeUndefined()
    })

    it('should find watchlist by exact name', () => {
      watchlistsService.createWatchlist({ name: 'Specific Watchlist', source: 'seeking_alpha' })

      const watchlist = watchlistsService.getWatchlistByName('Specific Watchlist')
      expect(watchlist).toBeDefined()
      expect(watchlist?.name).toBe('Specific Watchlist')
    })
  })
})
