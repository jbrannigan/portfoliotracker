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
  getAll: () => fetchJson('/symbols'),
  getOne: (symbol: string) => fetchJson(`/symbols/${symbol}`),
  getDetail: (symbol: string) => fetchJson(`/symbols/${symbol}/detail`),
}

// Accounts
export const accountsApi = {
  getAll: () => fetchJson('/accounts'),
  getOne: (id: number) => fetchJson(`/accounts/${id}`),
  create: (data: any) => fetchJson('/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// Watchlists
export const watchlistsApi = {
  getAll: () => fetchJson('/watchlists'),
  getOne: (id: number) => fetchJson(`/watchlists/${id}`),
  getMembers: (id: number) => fetchJson(`/watchlists/${id}/members`),
  create: (data: any) => fetchJson('/watchlists', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchJson(`/watchlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
}

// Positions
export const positionsApi = {
  getSummary: () => fetchJson('/positions/summary'),
  getAll: () => fetchJson('/positions'),
  getBySymbol: (symbol: string) => fetchJson(`/positions/by-symbol/${symbol}`),
}

// Transactions
export const transactionsApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return fetchJson(`/transactions${query}`)
  },
  getRecent: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : ''
    return fetchJson(`/transactions/recent${query}`)
  },
  create: (data: any) => fetchJson('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchJson(`/transactions/${id}`, {
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
    return fetchJson(`/quotes/${symbol}${query}`)
  },
  getAll: () => fetchJson('/quotes'),
  refresh: (symbols: string[]) => fetchJson('/quotes/refresh', {
    method: 'POST',
    body: JSON.stringify({ symbols }),
  }),
  getRateLimitStatus: () => fetchJson('/quotes/status/rate-limit'),
}

// Import
export const importApi = {
  schwab: async (file: File) => {
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
  seekingAlpha: async (file: File, watchlistId: number) => {
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
  motleyFool: async (file: File, watchlistId: number) => {
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

export { ApiError }
