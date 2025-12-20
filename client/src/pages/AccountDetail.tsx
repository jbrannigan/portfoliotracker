import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { accountsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { ArrowLeft, CreditCard, Building2, Wallet, BarChart3, TrendingUp, Layers } from 'lucide-react'

interface Account {
  id: number
  name: string
  broker?: string
  account_number_suffix?: string
  created_at: string
}

interface Position {
  id: number
  account_id: number
  symbol: string
  shares: number
  cost_basis?: number
  updated_at: string
  company_name?: string
  sector?: string
}

function AccountDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const accountId = parseInt(id)

  const { data: account, isLoading: accountLoading, error: accountError } = useQuery<Account>({
    queryKey: ['account', accountId],
    queryFn: () => accountsApi.getOne(accountId),
    enabled: !isNaN(accountId)
  })

  const { data: positions = [], isLoading: positionsLoading } = useQuery<Position[]>({
    queryKey: ['account', accountId, 'positions'],
    queryFn: async () => {
      const response = await fetch(`/api/accounts/${accountId}/positions`)
      if (!response.ok) throw new Error('Failed to fetch positions')
      return response.json()
    },
    enabled: !isNaN(accountId) && !!account
  })

  if (isNaN(accountId)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">Invalid account ID</p>
            <Link to="/accounts">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Accounts
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <Link to="/accounts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Accounts
          </Button>
        </Link>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
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

  if (accountError || !account) {
    return (
      <div className="space-y-6">
        <Link to="/accounts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Accounts
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">Failed to load account details</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate totals
  const totalPositions = positions.length
  const totalShares = positions.reduce((sum, p) => sum + p.shares, 0)
  const totalCostBasis = positions.reduce((sum, p) => sum + (p.cost_basis || 0), 0)
  const uniqueSymbols = new Set(positions.map(p => p.symbol)).size
  const uniqueSectors = new Set(positions.map(p => p.sector).filter(Boolean)).size

  // Group positions by sector for sector breakdown
  const positionsBySector = positions.reduce((acc, position) => {
    const sector = position.sector || 'Unknown'
    if (!acc[sector]) {
      acc[sector] = { count: 0, totalCostBasis: 0 }
    }
    acc[sector].count++
    acc[sector].totalCostBasis += position.cost_basis || 0
    return acc
  }, {} as Record<string, { count: number; totalCostBasis: number }>)

  const topSectors = Object.entries(positionsBySector)
    .sort((a, b) => b[1].totalCostBasis - a[1].totalCostBasis)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/accounts">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Accounts
        </Button>
      </Link>

      {/* Account Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl">{account.name}</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                {account.broker && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {account.broker}
                  </Badge>
                )}
                {account.account_number_suffix && (
                  <Badge variant="outline" className="font-mono">
                    ...{account.account_number_suffix}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Account created:</span>
            <span className="font-medium">
              {new Date(account.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">
              {totalShares.toLocaleString()} total shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Symbols</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSymbols}</div>
            <p className="text-xs text-muted-foreground">
              {uniqueSectors} sectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Basis</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCostBasis.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount invested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Position Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPositions > 0 ? (totalCostBasis / totalPositions).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per position
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sector Breakdown */}
      {topSectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sector Allocation
            </CardTitle>
            <CardDescription>Top sectors by cost basis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSectors.map(([sector, data]) => {
                const percentage = totalCostBasis > 0 ? (data.totalCostBasis / totalCostBasis) * 100 : 0
                return (
                  <div key={sector} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{sector}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {data.count} position{data.count !== 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold">
                          ${data.totalCostBasis.toLocaleString()}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Positions
          </CardTitle>
          <CardDescription>
            All holdings in this account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No positions in this account</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cost Basis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sector
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positions.map((position) => (
                    <tr key={position.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          to={`/positions/${position.symbol}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {position.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {position.company_name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {position.shares.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        {position.cost_basis ? `$${position.cost_basis.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {position.sector ? (
                          <Badge variant="outline" className="text-xs">
                            {position.sector}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AccountDetail
