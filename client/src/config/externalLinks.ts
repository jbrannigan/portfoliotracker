/**
 * External Links Configuration
 *
 * URL templates for external financial services.
 * Use placeholders that will be replaced at runtime:
 *   - SYMB: The stock symbol (e.g., "AAPL", "MSFT")
 *   - EXCH: The exchange (e.g., "NYSE", "NASDAQ")
 *
 * Note: Exchange values from Alpha Vantage are typically uppercase.
 */

export interface ExternalLinkConfig {
  /** Display name for the link */
  name: string
  /** URL template with SYMB and EXCH placeholders */
  urlTemplate: string
  /** Default exchange to use if none is available */
  defaultExchange?: string
  /** Whether exchange should be lowercase in the URL */
  lowercaseExchange?: boolean
  /** Whether symbol should be lowercase in the URL */
  lowercaseSymbol?: boolean
}

export const externalLinks: Record<string, ExternalLinkConfig> = {
  motleyFool: {
    name: 'Motley Fool',
    // Premium format: https://www.fool.com/premium/company/NYSE/AB/financials/summary
    urlTemplate: 'https://www.fool.com/premium/company/EXCH/SYMB/financials/summary',
    defaultExchange: 'NYSE',
    lowercaseExchange: false,
    lowercaseSymbol: false,
  },
  seekingAlpha: {
    name: 'Seeking Alpha',
    // Format: https://seekingalpha.com/symbol/AAPL
    urlTemplate: 'https://seekingalpha.com/symbol/SYMB',
    lowercaseSymbol: false,
  },
  yahoo: {
    name: 'Yahoo Finance',
    urlTemplate: 'https://finance.yahoo.com/quote/SYMB',
    lowercaseSymbol: false,
  },
  tradingView: {
    name: 'TradingView',
    urlTemplate: 'https://www.tradingview.com/symbols/EXCH-SYMB/',
    defaultExchange: 'NASDAQ',
    lowercaseExchange: false,
    lowercaseSymbol: false,
  },
}

/**
 * Build a URL from a template and symbol/exchange values
 */
export function buildExternalUrl(
  linkKey: keyof typeof externalLinks,
  symbol: string,
  exchange?: string | null
): string {
  const config = externalLinks[linkKey]
  if (!config) {
    throw new Error(`Unknown external link: ${linkKey}`)
  }

  // Use provided exchange, or default, or empty string
  let exch = exchange || config.defaultExchange || ''
  let symb = symbol

  // Apply case transformations
  if (config.lowercaseExchange) {
    exch = exch.toLowerCase()
  }
  if (config.lowercaseSymbol) {
    symb = symb.toLowerCase()
  }

  // Replace placeholders
  return config.urlTemplate
    .replace('EXCH', exch)
    .replace('SYMB', symb)
}
