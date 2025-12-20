import { Router } from 'express';
import * as quotesService from '../services/quotes.js';

export const quotesRouter = Router();

/**
 * GET /api/quotes/:symbol
 * Get quote for a symbol (from cache or API)
 */
quotesRouter.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { forceRefresh } = req.query;

    const quote = await quotesService.getQuote(
      symbol,
      forceRefresh === 'true'
    );

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);

    if (error instanceof Error && error.message.includes('Rate limit')) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message
        }
      });
    }

    if (error instanceof Error && error.message.includes('not configured')) {
      return res.status(503).json({
        error: {
          code: 'API_KEY_MISSING',
          message: 'Alpha Vantage API key not configured'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'QUOTE_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch quote'
      }
    });
  }
});

/**
 * POST /api/quotes/refresh
 * Force refresh quotes for one or more symbols
 */
quotesRouter.post('/refresh', async (req, res) => {
  try {
    const { symbols, includeOverview } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'symbols must be an array'
        }
      });
    }

    const results = [];
    const errors = [];

    for (const symbol of symbols) {
      try {
        const quote = includeOverview
          ? await quotesService.refreshQuoteWithOverview(symbol)
          : await quotesService.getQuote(symbol, true);

        results.push({ symbol, success: true, data: quote });
      } catch (error) {
        errors.push({
          symbol,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error refreshing quotes:', error);
    res.status(500).json({
      error: {
        code: 'REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to refresh quotes'
      }
    });
  }
});

/**
 * GET /api/quotes/status/rate-limit
 * Get rate limit status
 */
quotesRouter.get('/status/rate-limit', (req, res) => {
  try {
    const status = quotesService.getRateLimitStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      error: {
        code: 'STATUS_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get rate limit status'
      }
    });
  }
});

/**
 * GET /api/quotes
 * Get all cached quotes
 */
quotesRouter.get('/', (req, res) => {
  try {
    const quotes = quotesService.getAllCachedQuotes();
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching cached quotes:', error);
    res.status(500).json({
      error: {
        code: 'CACHE_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch cached quotes'
      }
    });
  }
});
