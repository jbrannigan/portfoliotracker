import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { watchlistsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Star, TrendingUp, DollarSign, ArrowRight } from 'lucide-react'

interface Watchlist {
  id: number
  name: string
  source: 'seeking_alpha' | 'motley_fool'
  dollar_allocation?: number
  created_at: string
  updated_at: string
}

function WatchlistList() {
  const { data: watchlists = [], isLoading, error } = useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: watchlistsApi.getAll
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Watchlists</h1>
          <p className="text-muted-foreground mt-2">Track and analyze your investment watchlists</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Watchlists</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-destructive">Failed to load watchlists</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const seekingAlphaWatchlists = watchlists.filter(w => w.source === 'seeking_alpha')
  const motleyFoolWatchlists = watchlists.filter(w => w.source === 'motley_fool')

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

  const renderWatchlistCards = (lists: Watchlist[]) => {
    if (lists.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No watchlists yet</p>
          </CardContent>
        </Card>
      )
    }

    return lists.map((watchlist) => (
      <Link key={watchlist.id} to={`/watchlists/${watchlist.id}`}>
        <Card className="group hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 h-full">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-2">
                  <Star className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{watchlist.name}</span>
                </CardTitle>
                <CardDescription className="mt-2">
                  {getSourceBadge(watchlist.source)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {watchlist.dollar_allocation ? (
              <div className="rounded-lg bg-accent/50 p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Target Allocation</span>
                  </div>
                  <div className="text-2xl font-bold">
                    ${watchlist.dollar_allocation.toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-accent/30 p-4 border border-dashed border-border">
                <div className="text-sm text-muted-foreground text-center">
                  No target allocation set
                </div>
              </div>
            )}

            <div className="flex items-center justify-end text-sm text-primary group-hover:gap-2 gap-1 transition-all">
              <span>View Details</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>
    ))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Watchlists</h1>
          <p className="text-muted-foreground mt-2">
            Track and analyze your investment watchlists from Seeking Alpha and Motley Fool
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold">{watchlists.length}</p>
            <p className="text-sm text-muted-foreground">Total Watchlists</p>
          </div>
        </div>
      </div>

      {watchlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Star className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No watchlists yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Import Seeking Alpha or Motley Fool data to create watchlists and track your investment strategies.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Seeking Alpha Watchlists */}
          {seekingAlphaWatchlists.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                  <h2 className="text-2xl font-bold">Seeking Alpha Watchlists</h2>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {seekingAlphaWatchlists.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {renderWatchlistCards(seekingAlphaWatchlists)}
              </div>
            </div>
          )}

          {/* Motley Fool Watchlists */}
          {motleyFoolWatchlists.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <h2 className="text-2xl font-bold">Motley Fool Watchlists</h2>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {motleyFoolWatchlists.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {renderWatchlistCards(motleyFoolWatchlists)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default WatchlistList
