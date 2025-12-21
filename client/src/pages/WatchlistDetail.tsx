import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { watchlistsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { StatusBadge, StatusType } from '../components/StatusBadge'
import { TradingViewMiniChart } from '../components/widgets/TradingViewMiniChart'
import { ArrowLeft, Star, DollarSign, TrendingUp, TrendingDown, Wallet, BarChart3, Target } from 'lucide-react'

interface Watchlist {
  id: number
  name: string
  source: 'seeking_alpha' | 'motley_fool'
  dollar_allocation?: number
  created_at: string
  updated_at: string
}

interface Member {
  symbol: string
  company_name?: string
  sector?: string
  total_shares: number
  total_cost_basis: number
  current_price?: number | null
  current_value?: number | null
}

interface WatchlistMembers {
  watchlist: Watchlist
  members: Member[]
}

function WatchlistDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const watchlistId = parseInt(id)
  const queryClient = useQueryClient()

  const [isEditingAllocation, setIsEditingAllocation] = useState(false)
  const [allocationInput, setAllocationInput] = useState('')

  const { data, isLoading, error } = useQuery<WatchlistMembers>({
    queryKey: ['watchlist', watchlistId, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/watchlists/${watchlistId}/members`)
      if (!response.ok) throw new Error('Failed to fetch watchlist')
      return response.json()
    },
    enabled: !isNaN(watchlistId)
  })

  const updateAllocationMutation = useMutation({
    mutationFn: async (newAllocation: number) => {
      return watchlistsApi.update(watchlistId, { dollar_allocation: newAllocation })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', watchlistId] })
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
      setIsEditingAllocation(false)
    }
  })

  if (isNaN(watchlistId)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">Invalid watchlist ID</p>
            <Link to="/watchlists">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Watchlists
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link to="/watchlists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Watchlists
          </Button>
        </Link>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link to="/watchlists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Watchlists
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">Failed to load watchlist details</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { watchlist, members } = data

  // Calculate totals
  const totalMembers = members.length
  const totalShares = members.reduce((sum, m) => sum + m.total_shares, 0)
  const totalCostBasis = members.reduce((sum, m) => sum + m.total_cost_basis, 0)
  const totalCurrentValue = members.reduce((sum, m) => sum + (m.current_value || 0), 0)
  const totalGainLoss = totalCurrentValue - totalCostBasis
  const targetPerSymbol = watchlist.dollar_allocation && totalMembers > 0
    ? watchlist.dollar_allocation / totalMembers
    : null

  const handleSaveAllocation = () => {
    const value = parseFloat(allocationInput)
    if (!isNaN(value) && value >= 0) {
      updateAllocationMutation.mutate(value)
    }
  }

  const handleStartEdit = () => {
    setAllocationInput(watchlist.dollar_allocation?.toString() || '')
    setIsEditingAllocation(true)
  }

  const getSourceBadge = (source: string) => {
    if (source === 'seeking_alpha') {
      return (
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
          Seeking Alpha
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
        Motley Fool
      </Badge>
    )
  }

  // Calculate allocation status for a member (10% tolerance)
  const getAllocationStatus = (member: Member): StatusType | null => {
    if (!targetPerSymbol) return null

    const actualValue = member.current_value || 0

    // No position
    if (member.total_shares === 0 && targetPerSymbol > 0) {
      return 'buy'
    }

    // Calculate variance
    const variance = (actualValue - targetPerSymbol) / targetPerSymbol

    if (variance < -0.10) return 'buy_more'
    if (variance > 0.10) return 'sell_some'

    return 'on_target'
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/watchlists">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Watchlists
        </Button>
      </Link>

      {/* Watchlist Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl">{watchlist.name}</CardTitle>
              </div>
              {getSourceBadge(watchlist.source)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="rounded-lg bg-card border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Target Allocation</span>
              </div>
              {!isEditingAllocation ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">
                    {watchlist.dollar_allocation ? `$${watchlist.dollar_allocation.toLocaleString()}` : 'Not set'}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={allocationInput}
                    onChange={(e) => setAllocationInput(e.target.value)}
                    className="w-32"
                    placeholder="0"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveAllocation}
                    disabled={updateAllocationMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingAllocation(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {targetPerSymbol && (
              <div className="mt-2 text-sm text-muted-foreground">
                Target per symbol: ${targetPerSymbol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Symbols</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {totalShares > 0 ? `${totalShares.toLocaleString()} total shares` : 'No shares held'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Basis</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCostBasis.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amount invested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Market value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {totalGainLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCostBasis > 0 ? `${((totalGainLoss / totalCostBasis) * 100).toFixed(2)}% return` : 'No basis'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members with Mini Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Member Symbols
          </CardTitle>
          <CardDescription>
            Watchlist holdings with live price charts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No symbols in this watchlist</p>
            </div>
          ) : (
            <div className="space-y-6">
              {members.map((member) => {
                const delta = targetPerSymbol && member.current_value
                  ? member.current_value - targetPerSymbol
                  : null
                const gainLoss = (member.current_value || 0) - member.total_cost_basis
                const allocationStatus = getAllocationStatus(member)

                return (
                  <Card key={member.symbol} className="overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Chart */}
                      <div className="p-6 border-r border-border">
                        <TradingViewMiniChart symbol={member.symbol} />
                      </div>

                      {/* Right: Details */}
                      <div className="p-6 space-y-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/positions/${member.symbol}`}
                              className="text-2xl font-bold text-primary hover:underline"
                            >
                              {member.symbol}
                            </Link>
                            {allocationStatus && allocationStatus !== 'on_target' && (
                              <StatusBadge status={allocationStatus} />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {member.company_name || '-'}
                          </p>
                          {member.sector && (
                            <Badge variant="outline" className="mt-2">
                              {member.sector}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Shares</p>
                            <p className="text-lg font-semibold">
                              {member.total_shares > 0 ? member.total_shares.toLocaleString() : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current Price</p>
                            <p className="text-lg font-semibold">
                              {member.current_price ? `$${member.current_price.toFixed(2)}` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cost Basis</p>
                            <p className="text-lg font-semibold">
                              ${member.total_cost_basis.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current Value</p>
                            <p className="text-lg font-semibold">
                              {member.current_value ? `$${member.current_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Gain/Loss</span>
                            <span className={`text-lg font-semibold ${gainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {delta !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Target Delta</span>
                              <span className={`text-lg font-semibold ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {delta >= 0 ? '+' : ''}${delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WatchlistDetail
