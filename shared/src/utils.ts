/**
 * Normalizes a stock symbol to uppercase with "/" replaced by "."
 *
 * Examples:
 * - "brk/b" → "BRK.B"
 * - "BRK.B" → "BRK.B"
 * - "AAPL " → "AAPL"
 * - "googl" → "GOOGL"
 *
 * @param symbol - The raw symbol string
 * @returns Normalized symbol
 */
export function normalizeSymbol(symbol: string): string {
  return symbol
    .toUpperCase()
    .replace('/', '.')
    .trim();
}
