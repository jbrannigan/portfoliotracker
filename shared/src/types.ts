// Core Types

export interface Symbol {
  symbol: string;
  company_name?: string;
  sector?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  account_number_suffix?: string;
  broker?: string;
  created_at: string;
}

export interface Watchlist {
  id: number;
  name: string;
  source: 'seeking_alpha' | 'motley_fool';
  dollar_allocation?: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: number;
  account_id: number;
  symbol: string;
  shares: number;
  cost_basis?: number;
  updated_at: string;
}

export interface WatchlistMember {
  id: number;
  watchlist_id: number;
  symbol: string;
  added_at: string;
  removed_at?: string;
}

// Ratings Types

export interface MotleyFoolRating {
  id: number;
  symbol: string;
  watchlist_id: number;
  rec_date?: string;
  cost_basis?: number;
  quant_5y?: number;
  allocation?: number;
  est_low_return?: number;
  est_high_return?: number;
  est_max_drawdown?: number;
  risk_tag?: 'Aggressive' | 'Moderate' | 'Cautious';
  times_recommended?: number;
  fcf_growth_1y?: number;
  gross_margin?: number;
  imported_at: string;
}

export interface SeekingAlphaRating {
  id: number;
  symbol: string;
  watchlist_id: number;
  quant_score?: number;
  sa_analyst_score?: number;
  wall_st_score?: number;
  valuation_grade?: string;
  growth_grade?: string;
  profitability_grade?: string;
  momentum_grade?: string;
  eps_revision_grade?: string;
  imported_at: string;
}

// Transaction Type

export interface Transaction {
  id: number;
  account_id: number;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  shares: number;
  price_per_share: number;
  total_amount?: number;
  transaction_date: string;
  reason_type?: 'watchlist_add' | 'watchlist_drop' | 'rebalance' | 'other';
  reason_watchlist_id?: number;
  reason_notes?: string;
  reason_url?: string;
  created_at: string;
}

// Quote Cache Type

export interface QuoteCache {
  symbol: string;
  price?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  high_52w?: number;
  low_52w?: number;
  market_cap?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  beta?: number;
  fetched_at: string;
}

// View Types

export interface PositionSummary {
  symbol: string;
  company_name?: string;
  sector?: string;
  total_shares: number;
  total_cost_basis: number;
  account_positions: Array<{
    account: string;
    shares: number;
    cost_basis: number;
  }>;
  watchlists: string[];
}

export interface TargetAllocation {
  symbol: string;
  watchlist_name: string;
  dollar_allocation?: number;
  symbols_in_watchlist: number;
  target_dollars: number;
}

// API Request/Response Types

export interface CreateAccountRequest {
  name: string;
  account_number_suffix?: string;
  broker?: string;
}

export interface CreateWatchlistRequest {
  name: string;
  source: 'seeking_alpha' | 'motley_fool';
  dollar_allocation?: number;
}

export interface UpdateWatchlistRequest {
  name?: string;
  dollar_allocation?: number;
}

export interface CreateTransactionRequest {
  account_id: number;
  symbol: string;
  transaction_type: 'BUY' | 'SELL';
  shares: number;
  price_per_share: number;
  total_amount?: number;
  transaction_date: string;
  reason_type?: 'watchlist_add' | 'watchlist_drop' | 'rebalance' | 'other';
  reason_watchlist_id?: number;
  reason_notes?: string;
  reason_url?: string;
}

// API Error Type

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// Import Result Types

export interface ImportResult {
  success: boolean;
  message: string;
  added?: number;
  updated?: number;
  errors?: string[];
}
