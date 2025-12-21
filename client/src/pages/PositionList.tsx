import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { positionsApi, watchlistsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { StatusBadge, StatusType } from '../components/StatusBadge'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react'

interface PositionSummary {
  symbol: string
  company_name?: string
  sector?: string
  total_shares: number
  total_cost_basis: number
  watchlist_ids: number[]
  watchlists: string[]
}

interface DroppedLink {
  symbol: string
  watchlist_name: string
  dropped_at: string
}

interface Watchlist {
  id: number
  name: string
  source: string
}

type SortField = 'symbol' | 'company_name' | 'total_shares' | 'sector'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | 'needs_action' | 'dropped' | 'on_target'

function PositionList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [watchlistFilter, setWatchlistFilter] = useState<string>('')
  const [sectorFilter, setSectorFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('symbol')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const { data: positions = [], isLoading: positionsLoading } = useQuery<PositionSummary[]>({
    queryKey: ['positions', 'summary'],
    queryFn: positionsApi.getSummary
  })

  const { data: watchlists = [] } = useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: watchlistsApi.getAll
  })

  const { data: droppedLinks = [] } = useQuery<DroppedLink[]>({
    queryKey: ['positions', 'dropped-links'],
    queryFn: positionsApi.getDroppedLinks
  })

  // Create a set of dropped symbols for quick lookup
  const droppedSymbols = useMemo(() => {
    return new Set(droppedLinks.map(link => link.symbol))
  }, [droppedLinks])

  // Get status for a position
  const getPositionStatus = (symbol: string): StatusType | null => {
    if (droppedSymbols.has(symbol)) return 'dropped'
    // TODO: Add allocation status checks when implemented
    return null
  }

  // Get unique sectors
  const sectors = useMemo(() => {
    const uniqueSectors = new Set(positions.map(p => p.sector).filter((s): s is string => Boolean(s)))
    return Array.from(uniqueSectors).sort()
  }, [positions])

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = positions.filter(position => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSymbol = position.symbol.toLowerCase().includes(search)
        const matchesCompany = position.company_name?.toLowerCase().includes(search)
        if (!matchesSymbol && !matchesCompany) return false
      }

      // Watchlist filter
      if (watchlistFilter) {
        const watchlistId = parseInt(watchlistFilter)
        if (!position.watchlist_ids.includes(watchlistId)) return false
      }

      // Sector filter
      if (sectorFilter && position.sector !== sectorFilter) return false

      // Status filter
      if (statusFilter !== 'all') {
        const status = getPositionStatus(position.symbol)
        if (statusFilter === 'dropped' && status !== 'dropped') return false
        if (statusFilter === 'needs_action' && !status) return false
        if (statusFilter === 'on_target' && status) return false
      }

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle undefined/null values
      if (aValue === undefined || aValue === null) aValue = ''
      if (bValue === undefined || bValue === null) bValue = ''

      // String comparison for text fields
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [positions, searchTerm, watchlistFilter, sectorFilter, statusFilter, sortField, sortDirection, droppedSymbols])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    )
  }

  if (positionsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Positions</h1>
          <p className="text-muted-foreground mt-2">All your stock positions</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Positions</h1>
        <p className="text-muted-foreground mt-2">
          Showing {filteredPositions.length} of {positions.length} positions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Search and filter your positions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Search */}
            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search
              </label>
              <Input
                id="search"
                placeholder="Symbol or company name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Watchlist Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Watchlist
              </label>
              <Select value={watchlistFilter} onValueChange={setWatchlistFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Watchlists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Watchlists</SelectItem>
                  {watchlists.map(w => (
                    <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sector Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Sector
              </label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Status
              </label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="needs_action">Needs Action</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="on_target">On Target</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setWatchlistFilter('')
                  setSectorFilter('')
                  setStatusFilter('all')
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Positions
          </CardTitle>
          <CardDescription>
            {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPositions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No positions found matching your filters</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th
                        onClick={() => handleSort('symbol')}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-accent/50 transition-colors w-24"
                      >
                        <div className="flex items-center">
                          Symbol
                          <SortIcon field="symbol" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('company_name')}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center">
                          Company
                          <SortIcon field="company_name" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('total_shares')}
                        className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-accent/50 transition-colors w-32"
                      >
                        <div className="flex items-center justify-end">
                          Total Shares
                          <SortIcon field="total_shares" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('sector')}
                        className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-accent/50 transition-colors w-40"
                      >
                        <div className="flex items-center">
                          Sector
                          <SortIcon field="sector" />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-48">
                        Watchlists
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPositions.map((position) => (
                      <tr
                        key={position.symbol}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Link
                            to={`/positions/${position.symbol}`}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {position.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {position.company_name || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {position.total_shares.toLocaleString()}
                        </td>
                        <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                          {position.sector ? (
                            <Badge variant="outline">{position.sector}</Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const status = getPositionStatus(position.symbol)
                            return status ? (
                              <StatusBadge status={status} />
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          {position.watchlists.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {position.watchlists.map((watchlist, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {watchlist}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PositionList
