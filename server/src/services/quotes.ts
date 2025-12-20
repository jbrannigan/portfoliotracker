import { db } from '../db/database.js';
import { normalizeSymbol } from '../../../shared/src/utils.js';
import type { QuoteCache } from '../../../shared/src/types.js';

const getApiKey = () => process.env.ALPHA_VANTAGE_API_KEY || '';
const QUOTE_CACHE_TTL = parseInt(process.env.QUOTE_CACHE_TTL || '900'); // 15 minutes default

// Rate limiting state
const rateLimiter = {
  requestsPerMinute: [] as number[],
  requestsPerDay: [] as number[],
  maxPerMinute: 5,
  maxPerDay: 25
};

interface AlphaVantageGlobalQuote {
  'Global Quote': {
    '01. symbol': string;
    '05. price': string;
    '09. change': string;
    '10. change percent': string;
    '06. volume': string;
    '07. latest trading day': string;
  };
}

interface AlphaVantageOverview {
  Symbol: string;
  '52WeekHigh': string;
  '52WeekLow': string;
  MarketCapitalization: string;
  PERatio: string;
  DividendYield: string;
  Beta: string;
}

/**
 * Check if we can make an API request (rate limiting)
 */
function canMakeRequest(): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Clean up old timestamps
  rateLimiter.requestsPerMinute = rateLimiter.requestsPerMinute.filter(t => t > oneMinuteAgo);
  rateLimiter.requestsPerDay = rateLimiter.requestsPerDay.filter(t => t > oneDayAgo);

  if (rateLimiter.requestsPerMinute.length >= rateLimiter.maxPerMinute) {
    return { allowed: false, reason: 'Rate limit: 5 requests per minute exceeded' };
  }

  if (rateLimiter.requestsPerDay.length >= rateLimiter.maxPerDay) {
    return { allowed: false, reason: 'Rate limit: 25 requests per day exceeded' };
  }

  return { allowed: true };
}

/**
 * Record an API request
 */
function recordRequest() {
  const now = Date.now();
  rateLimiter.requestsPerMinute.push(now);
  rateLimiter.requestsPerDay.push(now);
}

/**
 * Get cached quote if still fresh
 */
export function getCachedQuote(symbol: string): QuoteCache | undefined {
  const normalized = normalizeSymbol(symbol);

  const quote = db.prepare(`
    SELECT * FROM quotes_cache
    WHERE symbol = ?
  `).get(normalized) as QuoteCache | undefined;

  if (!quote) return undefined;

  // Check if cache is still fresh
  const fetchedAt = new Date(quote.fetched_at).getTime();
  const now = Date.now();
  const age = (now - fetchedAt) / 1000; // age in seconds

  if (age > QUOTE_CACHE_TTL) {
    return undefined; // Cache expired
  }

  return quote;
}

/**
 * Fetch quote from Alpha Vantage API
 */
async function fetchQuoteFromAPI(symbol: string): Promise<Partial<QuoteCache>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const rateCheck = canMakeRequest();
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason);
  }

  const normalized = normalizeSymbol(symbol);

  // Fetch global quote (current price)
  const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${normalized}&apikey=${apiKey}`;

  const quoteResponse = await fetch(quoteUrl);
  const quoteData = await quoteResponse.json() as AlphaVantageGlobalQuote;

  recordRequest();

  if (!quoteData['Global Quote'] || !quoteData['Global Quote']['05. price']) {
    throw new Error(`No data found for symbol: ${symbol}`);
  }

  const quote = quoteData['Global Quote'];

  const result: Partial<QuoteCache> = {
    symbol: normalized,
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    change_percent: parseFloat(quote['10. change percent'].replace('%', '')),
    volume: parseInt(quote['06. volume'])
  };

  return result;
}

/**
 * Fetch company overview (fundamentals) from Alpha Vantage
 */
async function fetchOverviewFromAPI(symbol: string): Promise<Partial<QuoteCache>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const rateCheck = canMakeRequest();
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.reason);
  }

  const normalized = normalizeSymbol(symbol);

  const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${normalized}&apikey=${apiKey}`;

  const overviewResponse = await fetch(overviewUrl);
  const overviewData = await overviewResponse.json() as AlphaVantageOverview;

  recordRequest();

  if (!overviewData.Symbol) {
    return {}; // No overview data available
  }

  const result: Partial<QuoteCache> = {
    high_52w: overviewData['52WeekHigh'] ? parseFloat(overviewData['52WeekHigh']) : undefined,
    low_52w: overviewData['52WeekLow'] ? parseFloat(overviewData['52WeekLow']) : undefined,
    market_cap: overviewData.MarketCapitalization ? parseFloat(overviewData.MarketCapitalization) : undefined,
    pe_ratio: overviewData.PERatio ? parseFloat(overviewData.PERatio) : undefined,
    dividend_yield: overviewData.DividendYield ? parseFloat(overviewData.DividendYield) * 100 : undefined, // Convert to percentage
    beta: overviewData.Beta ? parseFloat(overviewData.Beta) : undefined
  };

  return result;
}

/**
 * Update quote cache in database
 */
function updateQuoteCache(data: Partial<QuoteCache> & { symbol: string }): QuoteCache {
  const stmt = db.prepare(`
    INSERT INTO quotes_cache (
      symbol, price, change, change_percent, volume,
      high_52w, low_52w, market_cap, pe_ratio, dividend_yield, beta,
      fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(symbol) DO UPDATE SET
      price = COALESCE(excluded.price, price),
      change = COALESCE(excluded.change, change),
      change_percent = COALESCE(excluded.change_percent, change_percent),
      volume = COALESCE(excluded.volume, volume),
      high_52w = COALESCE(excluded.high_52w, high_52w),
      low_52w = COALESCE(excluded.low_52w, low_52w),
      market_cap = COALESCE(excluded.market_cap, market_cap),
      pe_ratio = COALESCE(excluded.pe_ratio, pe_ratio),
      dividend_yield = COALESCE(excluded.dividend_yield, dividend_yield),
      beta = COALESCE(excluded.beta, beta),
      fetched_at = datetime('now')
    RETURNING *
  `);

  return stmt.get(
    data.symbol,
    data.price || null,
    data.change || null,
    data.change_percent || null,
    data.volume || null,
    data.high_52w || null,
    data.low_52w || null,
    data.market_cap || null,
    data.pe_ratio || null,
    data.dividend_yield || null,
    data.beta || null
  ) as QuoteCache;
}

/**
 * Get quote (from cache or API)
 */
export async function getQuote(symbol: string, forceRefresh: boolean = false): Promise<QuoteCache> {
  const normalized = normalizeSymbol(symbol);

  // Check cache first
  if (!forceRefresh) {
    const cached = getCachedQuote(normalized);
    if (cached) {
      return cached;
    }
  }

  // Fetch from API
  const quoteData = await fetchQuoteFromAPI(normalized);

  // Update cache
  return updateQuoteCache({ symbol: normalized, ...quoteData });
}

/**
 * Refresh quote with full overview data
 */
export async function refreshQuoteWithOverview(symbol: string): Promise<QuoteCache> {
  const normalized = normalizeSymbol(symbol);

  // Fetch both quote and overview
  const quoteData = await fetchQuoteFromAPI(normalized);

  // Small delay to avoid hitting rate limit
  await new Promise(resolve => setTimeout(resolve, 500));

  const overviewData = await fetchOverviewFromAPI(normalized);

  // Combine and update cache
  return updateQuoteCache({
    symbol: normalized,
    ...quoteData,
    ...overviewData
  });
}

/**
 * Get all cached quotes
 */
export function getAllCachedQuotes(): QuoteCache[] {
  const stmt = db.prepare('SELECT * FROM quotes_cache ORDER BY symbol');
  return stmt.all() as QuoteCache[];
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const requestsInLastMinute = rateLimiter.requestsPerMinute.filter(t => t > oneMinuteAgo).length;
  const requestsInLastDay = rateLimiter.requestsPerDay.filter(t => t > oneDayAgo).length;

  return {
    requestsInLastMinute,
    requestsInLastDay,
    maxPerMinute: rateLimiter.maxPerMinute,
    maxPerDay: rateLimiter.maxPerDay,
    remainingThisMinute: rateLimiter.maxPerMinute - requestsInLastMinute,
    remainingToday: rateLimiter.maxPerDay - requestsInLastDay
  };
}
