import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { accountsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Wallet, Building2, CreditCard, ArrowRight } from 'lucide-react'

interface Account {
  id: number
  name: string
  broker?: string
  account_number_suffix?: string
  created_at: string
}

function AccountList() {
  const { data: accounts = [], isLoading, error } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-2">Manage your brokerage accounts</p>
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
          <h1 className="text-4xl font-bold tracking-tight">Accounts</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-destructive">Failed to load accounts</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group accounts by broker
  const accountsByBroker = accounts.reduce((acc, account) => {
    const broker = account.broker || 'Other'
    if (!acc[broker]) {
      acc[broker] = []
    }
    acc[broker].push(account)
    return acc
  }, {} as Record<string, Account[]>)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your brokerage accounts and track positions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold">{accounts.length}</p>
            <p className="text-sm text-muted-foreground">Total Accounts</p>
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Import a Schwab CSV file to create accounts and positions, or add accounts manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(accountsByBroker).map(([broker, brokerAccounts]) => (
            <div key={broker} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">{broker}</h2>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {brokerAccounts.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {brokerAccounts.map((account) => (
                  <Link key={account.id} to={`/accounts/${account.id}`}>
                    <Card className="group hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-2">
                              <CreditCard className="h-5 w-5 flex-shrink-0" />
                              <span className="truncate">{account.name}</span>
                            </CardTitle>
                            <CardDescription className="mt-2 space-y-1">
                              {account.account_number_suffix && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">Account #:</span>
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    ...{account.account_number_suffix}
                                  </Badge>
                                </div>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg bg-accent/50 p-4 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">Created</div>
                          <div className="text-sm font-medium">
                            {new Date(account.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-end text-sm text-primary group-hover:gap-2 gap-1 transition-all">
                          <span>View Details</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AccountList
