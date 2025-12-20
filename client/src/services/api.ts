import type {
  Symbol as StockSymbol,
  Account,
  Watchlist,
  WatchlistMember,
  Position,
  PositionSummary as BasePositionSummary,
  Transaction,
  QuoteCache,
  SeekingAlphaRating,
  MotleyFoolRating,
  CreateAccountRequest,
  CreateWatchlistRequest,
  UpdateWatchlistRequest,
  CreateTransactionRequest,
  ImportResult,
} from '../../../shared/src/types'

// Extended response types that include joined/computed data from API
export interface PositionSummary extends BasePositionSummary {
  watchlist_ids: number[]
}

export interface SymbolDetail {
  symbol: StockSymbol
  positions: (Position & { account_name?: string })[]
  ratings: {
    seekingAlpha: (SeekingAlphaRating & { watchlist_name?: string })[]
    motleyFool: (MotleyFoolRating & { watchlist_name?: string })[]
  }
  quote: QuoteCache | null
  watchlists: Watchlist[]
}

export interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  limit?: number
  offset: number
}

// API base URL - uses Vite proxy in dev, or can be configured for production
const API_BASE = '/api'

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(
      response.status,
      error.error?.message || error.message || 'Request failed',
      error.error?.details || error.details
    )
  }

  return response.json()
}

// Symbols
export const symbolsApi = {
  getAll: () => fetchJson<StockSymbol[]>('/symbols'),
  getOne: (symbol: string) => fetchJson<StockSymbol>(`/symbols/${symbol}`),
  getDetail: (symbol: string) => fetchJson<SymbolDetail>(`/symbols/${symbol}/detail`),
}

// Accounts
export const accountsApi = {
  getAll: () => fetchJson<Account[]>('/accounts'),
  getOne: (id: number) => fetchJson<Account>(`/accounts/${id}`),
  create: (data: CreateAccountRequest) => fetchJson<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// Watchlists
export const watchlistsApi = {
  getAll: () => fetchJson<Watchlist[]>('/watchlists'),
  getOne: (id: number) => fetchJson<Watchlist>(`/watchlists/${id}`),
  getMembers: (id: number) => fetchJson<WatchlistMember[]>(`/watchlists/${id}/members`),
  create: (data: CreateWatchlistRequest) => fetchJson<Watchlist>('/watchlists', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: UpdateWatchlistRequest) => fetchJson<Watchlist>(`/watchlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
}

// Positions
export const positionsApi = {
  getSummary: () => fetchJson<PositionSummary[]>('/positions/summary'),
  getAll: () => fetchJson<Position[]>('/positions'),
  getBySymbol: (symbol: string) => fetchJson<Position[]>(`/positions/by-symbol/${symbol}`),
}

// Transactions
export const transactionsApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return fetchJson<TransactionsResponse>(`/transactions${query}`)
  },
  getRecent: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : ''
    return fetchJson<Transaction[]>(`/transactions/recent${query}`)
  },
  create: (data: CreateTransactionRequest) => fetchJson<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchJson<{ success: boolean }>(`/transactions/${id}`, {
    method: 'DELETE',
  }),
  exportCsv: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return `${API_BASE}/transactions/export/csv${query}`
  },
  exportExcel: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return `${API_BASE}/transactions/export/excel${query}`
  },
}

// Quotes
export const quotesApi = {
  getOne: (symbol: string, forceRefresh = false) => {
    const query = forceRefresh ? '?forceRefresh=true' : ''
    return fetchJson<QuoteCache>(`/quotes/${symbol}${query}`)
  },
  getAll: () => fetchJson<QuoteCache[]>('/quotes'),
  refresh: (symbols: string[]) => fetchJson<{ refreshed: string[]; errors: string[] }>('/quotes/refresh', {
    method: 'POST',
    body: JSON.stringify({ symbols }),
  }),
  getRateLimitStatus: () => fetchJson<{ remaining: number; resetAt: string }>('/quotes/status/rate-limit'),
}

// Import
export const importApi = {
  schwab: async (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${API_BASE}/import/schwab`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new ApiError(
        response.status,
        error.error?.message || 'Upload failed',
        error.error?.details
      )
    }
    return response.json()
  },
  seekingAlpha: async (file: File, watchlistId: number): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('watchlist_id', watchlistId.toString())
    const response = await fetch(`${API_BASE}/import/seeking-alpha`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new ApiError(
        response.status,
        error.error?.message || 'Upload failed',
        error.error?.details
      )
    }
    return response.json()
  },
  motleyFool: async (file: File, watchlistId: number): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('watchlist_id', watchlistId.toString())
    const response = await fetch(`${API_BASE}/import/motley-fool`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new ApiError(
        response.status,
        error.error?.message || 'Upload failed',
        error.error?.details
      )
    }
    return response.json()
  },
}

// Admin
export const adminApi = {
  getStats: () => fetchJson<{
    orphanSymbols: number
    transactions: number
    quotesCache: number
    removedMembers: number
  }>('/admin/stats'),

  downloadBackup: () => {
    window.location.href = `${API_BASE}/admin/backup`
  },

  deleteOrphanSymbols: () => fetchJson<{ success: boolean; deleted: number }>('/admin/orphan-symbols', {
    method: 'DELETE',
  }),

  clearTransactions: () => fetchJson<{ success: boolean; deleted: number }>('/admin/transactions', {
    method: 'DELETE',
  }),

  clearQuotesCache: () => fetchJson<{ success: boolean; deleted: number }>('/admin/quotes-cache', {
    method: 'DELETE',
  }),

  purgeRemovedMembers: () => fetchJson<{ success: boolean; deleted: number }>('/admin/purge-removed-members', {
    method: 'DELETE',
  }),
}

// Extended accounts API for admin
export const accountsAdminApi = {
  ...accountsApi,
  update: (id: number, data: Partial<CreateAccountRequest>) => fetchJson<Account>(`/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchJson<{
    success: boolean
    deleted: { account: string; positions: number }
  }>(`/accounts/${id}`, {
    method: 'DELETE',
  }),
}

// Extended watchlists API for admin
export const watchlistsAdminApi = {
  ...watchlistsApi,
  delete: (id: number) => fetchJson<{
    success: boolean
    deleted: { watchlist: string; members: number; ratings: number }
  }>(`/watchlists/${id}`, {
    method: 'DELETE',
  }),
  removeSymbol: (id: number, symbol: string) => fetchJson<{
    success: boolean
    removed: { symbol: string; watchlist: string }
  }>(`/watchlists/${id}/symbols/${symbol}`, {
    method: 'DELETE',
  }),
}

export { ApiError }
