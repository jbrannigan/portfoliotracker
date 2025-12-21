import { useQuery } from '@tanstack/react-query'
import { positionsApi, accountsApi, watchlistsApi, transactionsApi, dashboardApi } from '../services/api'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { TradingViewHeatmap } from '../components/widgets/TradingViewHeatmap'
import { TradingViewTickerTape } from '../components/widgets/TradingViewTickerTape'
import { TrendingUp, Star, Activity, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'

interface HealthStatus {
  status: string
  message: string
}

interface PositionSummary {
  symbol: string
  company_name?: string
  sector?: string
  total_shares: number
  total_cost_basis: number
  watchlist_names?: string[]
}

interface Account {
  id: number
  name: string
  broker?: string
}

interface Watchlist {
  id: number
  name: string
  source: 'seeking_alpha' | 'motley_fool'
  dollar_allocation?: number
}

interface Transaction {
  id: number
  account_id: number
  symbol: string
  transaction_type: 'BUY' | 'SELL'
  shares: number
  price_per_share: number
  total_amount?: number
  transaction_date: string
  reason_type?: string
}

function Dashboard() {
  const { data: health } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })

  const { data: positions = [], isLoading: positionsLoading } = useQuery<PositionSummary[]>({
    queryKey: ['positions', 'summary'],
    queryFn: positionsApi.getSummary
  })

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll
  })

  const { data: watchlists = [] } = useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: watchlistsApi.getAll
  })

  const { data: recentTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.getRecent(5)
  })

  const { data: needsAttentionData } = useQuery({
    queryKey: ['dashboard', 'needs-attention'],
    queryFn: dashboardApi.getNeedsAttention
  })

  const needsAttentionItems = needsAttentionData?.items || []

  // Calculate portfolio stats
  const totalPositions = positions.length
  const totalCostBasis = positions.reduce((sum, p) => sum + p.total_cost_basis, 0)
  const uniqueSectors = new Set(positions.map(p => p.sector).filter(Boolean)).size

  // Top positions by cost basis
  const topPositions = [...positions]
    .sort((a, b) => b.total_cost_basis - a.total_cost_basis)
    .slice(0, 5)

  // Watchlist breakdown
  const seekingAlphaWatchlists = watchlists.filter(w => w.source === 'seeking_alpha')
  const motleyFoolWatchlists = watchlists.filter(w => w.source === 'motley_fool')

  return (
    <div className="space-y-8">
      {/* Hero Section - Portfolio Summary */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-card via-card to-accent/5 p-8">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight">
            ${totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <p className="text-muted-foreground mt-2">Total Portfolio Value</p>
          <div className="mt-6 flex flex-wrap gap-6">
            <div>
              <p className="text-2xl font-semibold">{totalPositions}</p>
              <p className="text-sm text-muted-foreground">Positions</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Accounts</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{uniqueSectors}</p>
              <p className="text-sm text-muted-foreground">Sectors</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{watchlists.length}</p>
              <p className="text-sm text-muted-foreground">Watchlists</p>
            </div>
          </div>
          {health?.status === 'ok' && (
            <Badge variant="secondary" className="mt-4">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                API Connected
              </span>
            </Badge>
          )}
        </div>
      </div>

      {/* TradingView Ticker Tape */}
      <div className="rounded-lg overflow-hidden border border-border">
        <TradingViewTickerTape />
      </div>

      {/* Needs Attention */}
      {needsAttentionItems.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Needs Attention
                </CardTitle>
                <CardDescription>
                  {needsAttentionItems.length} item{needsAttentionItems.length !== 1 ? 's' : ''} requiring action
                </CardDescription>
              </div>
              <Link to="/positions?status=needs_action" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsAttentionItems.slice(0, 5).map((item, idx) => (
                <div
                  key={`${item.symbol}-${item.watchlist}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={item.type === 'dropped' ? 'dropped' : item.type === 'buy' ? 'buy' : item.type === 'underweight' ? 'buy_more' : 'sell_some'}
                    />
                    <div>
                      <Link
                        to={`/positions/${item.symbol}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {item.symbol}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.message}
                      </p>
                    </div>
                  </div>
                  {item.type === 'dropped' && item.dropped_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.dropped_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Positions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Positions</CardTitle>
                <CardDescription>Largest holdings by cost basis</CardDescription>
              </div>
              <Link to="/positions" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {positionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topPositions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No positions yet</p>
                <p className="text-xs mt-1">Import data to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topPositions.map((position, idx) => (
                  <div
                    key={position.symbol}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/positions/${position.symbol}`}
                          className="text-sm font-semibold text-primary hover:underline block"
                        >
                          {position.symbol}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {position.company_name || '-'}
                        </p>
                        {position.watchlist_names && position.watchlist_names.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {position.watchlist_names.slice(0, 2).map((name, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        ${position.total_cost_basis.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {position.total_shares.toLocaleString()} shares
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest transactions</CardDescription>
              </div>
              <Link to="/transactions" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No transactions</p>
                <p className="text-xs mt-1">Start tracking your trades</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {transaction.transaction_type === 'BUY' ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                      <div>
                        <Link
                          to={`/positions/${transaction.symbol}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {transaction.symbol}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {transaction.shares} shares @ ${transaction.price_per_share.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${(transaction.total_amount ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TradingView Market Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>S&P 500 Heatmap</CardTitle>
          <CardDescription>Market overview by sector performance</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg overflow-hidden">
            <TradingViewHeatmap height={500} />
          </div>
        </CardContent>
      </Card>

      {/* Watchlists Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Seeking Alpha Watchlists
                </CardTitle>
                <CardDescription>{seekingAlphaWatchlists.length} watchlists</CardDescription>
              </div>
              <Link to="/watchlists" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {seekingAlphaWatchlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No Seeking Alpha watchlists</p>
              </div>
            ) : (
              <div className="space-y-2">
                {seekingAlphaWatchlists.slice(0, 5).map((w) => (
                  <Link
                    key={w.id}
                    to={`/watchlists/${w.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{w.name}</span>
                    {w.dollar_allocation && (
                      <span className="text-sm text-muted-foreground">
                        ${w.dollar_allocation.toLocaleString()}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Motley Fool Watchlists
                </CardTitle>
                <CardDescription>{motleyFoolWatchlists.length} watchlists</CardDescription>
              </div>
              <Link to="/watchlists" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {motleyFoolWatchlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No Motley Fool watchlists</p>
              </div>
            ) : (
              <div className="space-y-2">
                {motleyFoolWatchlists.slice(0, 5).map((w) => (
                  <Link
                    key={w.id}
                    to={`/watchlists/${w.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{w.name}</span>
                    {w.dollar_allocation && (
                      <span className="text-sm text-muted-foreground">
                        ${w.dollar_allocation.toLocaleString()}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
