import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { getTestDb, resetTestDb, closeTestDb } from '../test/db.js'

// Mock the database module before importing services
vi.mock('../db/database.js', async () => {
  const testDb = await import('../test/db.js')
  return {
    db: testDb.getTestDb(),
    closeDatabase: testDb.closeTestDb
  }
})

// Import services after mocking
import * as accountsService from './accounts.js'

describe('Accounts Service', () => {
  beforeEach(() => {
    resetTestDb()
  })

  afterAll(() => {
    closeTestDb()
  })

  describe('getAllAccounts', () => {
    it('should return empty array when no accounts exist', () => {
      const accounts = accountsService.getAllAccounts()
      expect(accounts).toEqual([])
    })

    it('should return all accounts sorted by name', () => {
      const db = getTestDb()
      db.exec(`
        INSERT INTO accounts (name, broker) VALUES
        ('Zebra Account', 'Broker A'),
        ('Alpha Account', 'Broker B')
      `)

      const accounts = accountsService.getAllAccounts()
      expect(accounts).toHaveLength(2)
      expect(accounts[0].name).toBe('Alpha Account')
      expect(accounts[1].name).toBe('Zebra Account')
    })
  })

  describe('getAccount', () => {
    it('should return undefined for non-existent account', () => {
      const account = accountsService.getAccount(999)
      expect(account).toBeUndefined()
    })

    it('should return account by ID', () => {
      const db = getTestDb()
      db.exec(`INSERT INTO accounts (name, broker, account_number_suffix) VALUES ('Test Account', 'Schwab', '1234')`)

      const inserted = db.prepare('SELECT id FROM accounts WHERE name = ?').get('Test Account') as { id: number }
      const account = accountsService.getAccount(inserted.id)
      expect(account).toBeDefined()
      expect(account?.name).toBe('Test Account')
      expect(account?.broker).toBe('Schwab')
      expect(account?.account_number_suffix).toBe('1234')
    })
  })

  describe('createAccount', () => {
    it('should create account with required fields only', () => {
      const account = accountsService.createAccount({ name: 'New Account' })

      expect(account).toBeDefined()
      expect(account.name).toBe('New Account')
      expect(account.broker).toBeNull()
      expect(account.account_number_suffix).toBeNull()
    })

    it('should create account with all fields', () => {
      const account = accountsService.createAccount({
        name: 'Full Account',
        broker: 'Fidelity',
        account_number_suffix: '5678'
      })

      expect(account.name).toBe('Full Account')
      expect(account.broker).toBe('Fidelity')
      expect(account.account_number_suffix).toBe('5678')
    })

    it('should throw on duplicate name', () => {
      accountsService.createAccount({ name: 'Duplicate' })

      expect(() => {
        accountsService.createAccount({ name: 'Duplicate' })
      }).toThrow()
    })
  })

  describe('updateAccount', () => {
    it('should return undefined for non-existent account', () => {
      const result = accountsService.updateAccount(999, { name: 'Updated' })
      expect(result).toBeUndefined()
    })

    it('should update account name', () => {
      const created = accountsService.createAccount({ name: 'Original Name' })

      const updated = accountsService.updateAccount(created.id, { name: 'Updated Name' })

      expect(updated).toBeDefined()
      expect(updated?.name).toBe('Updated Name')
    })

    it('should update multiple fields', () => {
      const created = accountsService.createAccount({ name: 'Account', broker: 'OldBroker' })

      const updated = accountsService.updateAccount(created.id, {
        name: 'New Name',
        broker: 'NewBroker',
        account_number_suffix: '9999'
      })

      expect(updated?.name).toBe('New Name')
      expect(updated?.broker).toBe('NewBroker')
      expect(updated?.account_number_suffix).toBe('9999')
    })

    it('should keep existing values when not provided', () => {
      const created = accountsService.createAccount({
        name: 'Account',
        broker: 'Broker',
        account_number_suffix: '1234'
      })

      const updated = accountsService.updateAccount(created.id, { name: 'New Name' })

      expect(updated?.name).toBe('New Name')
      expect(updated?.broker).toBe('Broker')
      expect(updated?.account_number_suffix).toBe('1234')
    })
  })

  describe('deleteAccount', () => {
    it('should return false for non-existent account', () => {
      const result = accountsService.deleteAccount(999)
      expect(result).toBe(false)
    })

    it('should delete existing account', () => {
      const created = accountsService.createAccount({ name: 'To Delete' })

      const result = accountsService.deleteAccount(created.id)
      expect(result).toBe(true)

      const account = accountsService.getAccount(created.id)
      expect(account).toBeUndefined()
    })

    it('should cascade delete positions', () => {
      const db = getTestDb()
      const account = accountsService.createAccount({ name: 'Account With Positions' })

      db.exec(`INSERT INTO symbols (symbol) VALUES ('AAPL')`)
      db.exec(`INSERT INTO positions (account_id, symbol, shares) VALUES (${account.id}, 'AAPL', 100)`)

      const positionsBefore = db.prepare('SELECT COUNT(*) as count FROM positions').get() as { count: number }
      expect(positionsBefore.count).toBe(1)

      accountsService.deleteAccount(account.id)

      const positionsAfter = db.prepare('SELECT COUNT(*) as count FROM positions').get() as { count: number }
      expect(positionsAfter.count).toBe(0)
    })
  })

  describe('getAccountByName', () => {
    it('should return undefined for non-existent name', () => {
      const account = accountsService.getAccountByName('NonExistent')
      expect(account).toBeUndefined()
    })

    it('should find account by exact name', () => {
      accountsService.createAccount({ name: 'Specific Account', broker: 'Broker' })

      const account = accountsService.getAccountByName('Specific Account')
      expect(account).toBeDefined()
      expect(account?.name).toBe('Specific Account')
    })
  })
})
