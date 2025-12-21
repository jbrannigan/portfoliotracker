import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { symbolsApi, positionsApi } from '../services/api'
import { buildExternalUrl } from '../config/externalLinks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { TradingViewChart } from '../components/widgets/TradingViewChart'
import { TradingViewSymbolInfo } from '../components/widgets/TradingViewSymbolInfo'
import { TradingViewTechnicalAnalysis } from '../components/widgets/TradingViewTechnicalAnalysis'
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Star, Wallet, AlertTriangle } from 'lucide-react'

interface Position {
  id: number
  account_id: number
  account_name?: string
  symbol: string
  shares: number
  cost_basis?: number
  updated_at: string
}

interface QuoteCache {
  symbol: string
  exchange?: string
  price?: number
  change?: number
  change_percent?: number
  volume?: number
  high_52w?: number
  low_52w?: number
  market_cap?: number
  pe_ratio?: number
  dividend_yield?: number
  beta?: number
  fetched_at: string
}

interface SeekingAlphaRating {
  id: number
  symbol: string
  watchlist_id: number
  watchlist_name?: string
  quant_score?: number
  sa_analyst_score?: number
  wall_st_score?: number
  valuation_grade?: string
  growth_grade?: string
  profitability_grade?: string
  momentum_grade?: string
  eps_revision_grade?: string
  imported_at: string
}

interface MotleyFoolRating {
  id: number
  symbol: string
  watchlist_id: number
  watchlist_name?: string
  rec_date?: string
  cost_basis?: number
  quant_5y?: number
  allocation?: number
  est_low_return?: number
  est_high_return?: number
  est_max_drawdown?: number
  risk_tag?: string
  times_recommended?: number
  fcf_growth_1y?: number
  gross_margin?: number
  imported_at: string
}

interface Watchlist {
  id: number
  name: string
  source: string
  dollar_allocation?: number
}

interface SymbolDetail {
  symbol: {
    symbol: string
    company_name?: string
    sector?: string
  }
  positions: Position[]
  ratings: {
    seekingAlpha: SeekingAlphaRating[]
    motleyFool: MotleyFoolRating[]
  }
  quote: QuoteCache | null
  watchlists: Watchlist[]
}

function PositionDetail() {
  const { symbol = '' } = useParams<{ symbol: string }>()

  const { data: detail, isLoading, error } = useQuery<SymbolDetail>({
    queryKey: ['symbol', 'detail', symbol],
    queryFn: () => symbolsApi.getDetail(symbol),
    enabled: !!symbol
  })

  // Fetch dropped links to show status
  const { data: droppedLinks = [] } = useQuery({
    queryKey: ['positions', 'dropped-links'],
    queryFn: positionsApi.getDroppedLinks
  })

  // Filter dropped links for this symbol
  const symbolDroppedLinks = droppedLinks.filter(link => link.symbol === symbol)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">Failed to load position details</div>
        <Button asChild variant="outline">
          <Link to="/positions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Positions
          </Link>
        </Button>
      </div>
    )
  }

  const { symbol: symbolInfo, positions, ratings, quote, watchlists } = detail

  // Calculate totals
  const totalShares = positions.reduce((sum, p) => sum + p.shares, 0)
  const totalCostBasis = positions.reduce((sum, p) => sum + (p.cost_basis || 0), 0)
  const currentValue = quote?.price ? totalShares * quote.price : null
  const gainLoss = currentValue && totalCostBasis ? currentValue - totalCostBasis : null
  const gainLossPercent = gainLoss && totalCostBasis ? (gainLoss / totalCostBasis) * 100 : null

  const gradeColor = (grade?: string) => {
    if (!grade) return 'secondary'
    const g = grade.toUpperCase()
    if (g.startsWith('A')) return 'default'
    if (g.startsWith('B')) return 'secondary'
    if (g.startsWith('C')) return 'secondary'
    if (g.startsWith('D')) return 'outline'
    if (g.startsWith('F')) return 'destructive'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/positions">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Positions
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold tracking-tight">{symbol}</h1>
            {symbolDroppedLinks.length > 0 && (
              <StatusBadge status="dropped" />
            )}
          </div>
          {symbolInfo.company_name && (
            <p className="text-xl text-muted-foreground">{symbolInfo.company_name}</p>
          )}
          {symbolInfo.sector && (
            <Badge variant="secondary">{symbolInfo.sector}</Badge>
          )}
        </div>

        {quote && (
          <div className="space-y-2">
            <div className="text-right">
              <div className="text-4xl font-bold">
                ${quote.price?.toFixed(2)}
              </div>
              {quote.change !== undefined && quote.change_percent !== undefined && (
                <div className="flex items-center justify-end gap-2 mt-2">
                  {quote.change >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`text-lg font-medium ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent >= 0 ? '+' : ''}{quote.change_percent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a
            href={buildExternalUrl('seekingAlpha', symbolInfo.symbol)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Seeking Alpha
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a
            href={buildExternalUrl('motleyFool', symbolInfo.symbol, quote?.exchange)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Motley Fool
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* TradingView Advanced Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Chart</CardTitle>
          <CardDescription>Advanced charting powered by TradingView</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg overflow-hidden">
            <TradingViewChart symbol={symbol} height={600} />
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Symbol Info Widget */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Symbol Information</CardTitle>
            <CardDescription>Real-time market data and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <TradingViewSymbolInfo symbol={symbol} />
          </CardContent>
        </Card>

        {/* Technical Analysis Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Analysis</CardTitle>
            <CardDescription>Buy/Sell signals</CardDescription>
          </CardHeader>
          <CardContent>
            <TradingViewTechnicalAnalysis symbol={symbol} />
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Your Holdings
              </CardTitle>
              <CardDescription>Positions across all accounts</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Shares</p>
              <p className="text-2xl font-bold">{totalShares.toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Account</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Shares</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Cost Basis</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Current Value</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => {
                    const posValue = quote?.price ? position.shares * quote.price : null
                    const posGain = posValue && position.cost_basis ? posValue - position.cost_basis : null
                    const posGainPercent = posGain && position.cost_basis ? (posGain / position.cost_basis) * 100 : null

                    return (
                      <tr key={position.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">
                          {position.account_name || `Account ${position.account_id}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {position.shares.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {position.cost_basis ? `$${position.cost_basis.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {posValue ? `$${posValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {posGain !== null && posGainPercent !== null ? (
                            <div className={posGain >= 0 ? 'text-green-500' : 'text-red-500'}>
                              <div className="font-medium">
                                {posGain >= 0 ? '+' : ''}${posGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs">
                                ({posGainPercent >= 0 ? '+' : ''}{posGainPercent.toFixed(2)}%)
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Total row */}
                  <tr className="bg-muted font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{totalShares.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${totalCostBasis.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {currentValue ? `$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {gainLoss !== null && gainLossPercent !== null ? (
                        <div className={gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                          <div>
                            {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs">
                            ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ratings Comparison */}
      {(ratings.seekingAlpha.length > 0 || ratings.motleyFool.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Seeking Alpha Ratings */}
          {ratings.seekingAlpha.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-500" />
                  Seeking Alpha Ratings
                </CardTitle>
                <CardDescription>Analyst and quant scores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratings.seekingAlpha.map((rating, idx) => (
                  <div key={rating.id} className={idx > 0 ? 'pt-4 border-t' : ''}>
                    {rating.watchlist_name && (
                      <Badge variant="outline" className="mb-3">
                        {rating.watchlist_name}
                      </Badge>
                    )}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {rating.quant_score != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Quant Score</p>
                          <p className="text-2xl font-bold">{rating.quant_score.toFixed(2)}</p>
                        </div>
                      )}
                      {rating.sa_analyst_score != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">SA Analyst</p>
                          <p className="text-2xl font-bold">{rating.sa_analyst_score.toFixed(2)}</p>
                        </div>
                      )}
                      {rating.wall_st_score != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Wall Street</p>
                          <p className="text-2xl font-bold">{rating.wall_st_score.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rating.valuation_grade && (
                        <Badge variant={gradeColor(rating.valuation_grade)}>
                          Valuation: {rating.valuation_grade}
                        </Badge>
                      )}
                      {rating.growth_grade && (
                        <Badge variant={gradeColor(rating.growth_grade)}>
                          Growth: {rating.growth_grade}
                        </Badge>
                      )}
                      {rating.profitability_grade && (
                        <Badge variant={gradeColor(rating.profitability_grade)}>
                          Profit: {rating.profitability_grade}
                        </Badge>
                      )}
                      {rating.momentum_grade && (
                        <Badge variant={gradeColor(rating.momentum_grade)}>
                          Momentum: {rating.momentum_grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Motley Fool Ratings */}
          {ratings.motleyFool.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-green-500" />
                  Motley Fool Ratings
                </CardTitle>
                <CardDescription>Investment research and metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ratings.motleyFool.map((rating, idx) => (
                  <div key={rating.id} className={idx > 0 ? 'pt-4 border-t' : ''}>
                    {rating.watchlist_name && (
                      <Badge variant="outline" className="mb-3">
                        {rating.watchlist_name}
                      </Badge>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {rating.quant_5y != null && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Quant 5Y</p>
                          <p className="font-semibold">{(rating.quant_5y * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {rating.risk_tag && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Risk Level</p>
                          <Badge variant="secondary">{rating.risk_tag}</Badge>
                        </div>
                      )}
                      {rating.times_recommended != null && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Times Recommended</p>
                          <p className="font-semibold">{rating.times_recommended}</p>
                        </div>
                      )}
                      {rating.est_low_return != null && rating.est_high_return != null && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Est. Return Range</p>
                          <p className="font-semibold">
                            {(rating.est_low_return * 100).toFixed(0)}% - {(rating.est_high_return * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                      {rating.fcf_growth_1y != null && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">FCF Growth 1Y</p>
                          <p className="font-semibold">{(rating.fcf_growth_1y * 100).toFixed(1)}%</p>
                        </div>
                      )}
                      {rating.gross_margin != null && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Gross Margin</p>
                          <p className="font-semibold">{(rating.gross_margin * 100).toFixed(1)}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Watchlist Recommendations */}
      {watchlists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Watchlist Recommendations
            </CardTitle>
            <CardDescription>
              This symbol appears in {watchlists.length} watchlist{watchlists.length !== 1 ? 's' : ''}
              {symbolDroppedLinks.length > 0 && (
                <span className="text-destructive ml-2">
                  ({symbolDroppedLinks.length} dropped)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {watchlists.map((watchlist) => {
                const droppedLink = symbolDroppedLinks.find(l => l.watchlist_name === watchlist.name)
                const isDropped = !!droppedLink

                return (
                  <div
                    key={watchlist.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isDropped ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{watchlist.name}</p>
                          {isDropped && <StatusBadge status="dropped" showIcon={false} />}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {watchlist.source.replace('_', ' ')}
                        </Badge>
                        {isDropped && droppedLink.dropped_at && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Dropped {new Date(droppedLink.dropped_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {!isDropped && watchlist.dollar_allocation && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Allocation</p>
                          <p className="font-semibold">${watchlist.dollar_allocation.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PositionDetail
