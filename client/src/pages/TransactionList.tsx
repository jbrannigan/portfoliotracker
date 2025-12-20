import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { transactionsApi, accountsApi, watchlistsApi } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { useToast } from '../hooks/use-toast'
import {
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
  Plus,
  Filter,
  X,
  Calendar,
  Receipt,
  ExternalLink
} from 'lucide-react'

interface Transaction {
  id: number
  account_id: number
  symbol: string
  transaction_type: 'BUY' | 'SELL'
  shares: number
  price_per_share: number
  total_amount?: number
  transaction_date: string
  reason_type?: 'watchlist_add' | 'watchlist_drop' | 'rebalance' | 'other'
  reason_watchlist_id?: number
  reason_notes?: string
  reason_url?: string
  created_at: string
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
}

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  limit?: number
  offset: number
}

function TransactionList() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Filter state
  const [symbolFilter, setSymbolFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 25

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      limit: pageSize.toString(),
      offset: ((page - 1) * pageSize).toString()
    }
    if (symbolFilter) params.symbol = symbolFilter
    if (accountFilter) params.account_id = accountFilter
    if (typeFilter) params.transaction_type = typeFilter
    if (reasonFilter) params.reason_type = reasonFilter
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    return params
  }, [symbolFilter, accountFilter, typeFilter, reasonFilter, startDate, endDate, page, pageSize])

  // Fetch transactions
  const { data, isLoading, error } = useQuery<TransactionsResponse>({
    queryKey: ['transactions', queryParams],
    queryFn: () => transactionsApi.getAll(queryParams)
  })

  // Fetch accounts and watchlists for filters and display
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll
  })

  const { data: watchlists = [] } = useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: watchlistsApi.getAll
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setDeleteConfirm(null)
      toast({
        title: 'Transaction deleted',
        description: 'The transaction has been removed from your log.',
      })
    }
  })

  // Helper maps
  const accountMap = useMemo(() => {
    return new Map(accounts.map(a => [a.id, a]))
  }, [accounts])

  const watchlistMap = useMemo(() => {
    return new Map(watchlists.map(w => [w.id, w]))
  }, [watchlists])

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setPage(1)
  }

  // Export handlers
  const handleExportCsv = () => {
    const url = transactionsApi.exportCsv(queryParams)
    window.location.href = url
    toast({
      title: 'Export started',
      description: 'Your CSV file will download shortly.',
    })
  }

  const handleExportExcel = () => {
    const url = transactionsApi.exportExcel(queryParams)
    window.location.href = url
    toast({
      title: 'Export started',
      description: 'Your Excel file will download shortly.',
    })
  }

  // Pagination calculations
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0
  const startRecord = data ? (page - 1) * pageSize + 1 : 0
  const endRecord = data ? Math.min(page * pageSize, data.total) : 0

  const hasActiveFilters = symbolFilter || accountFilter || typeFilter || reasonFilter || startDate || endDate

  const clearFilters = () => {
    setSymbolFilter('')
    setAccountFilter('')
    setTypeFilter('')
    setReasonFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getReasonBadge = (type?: string) => {
    if (!type) return null

    const badges = {
      watchlist_add: 'bg-green-500/10 text-green-400 border-green-500/20',
      watchlist_drop: 'bg-red-500/10 text-red-400 border-red-500/20',
      rebalance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      other: 'bg-muted text-muted-foreground border-border'
    }

    const labels = {
      watchlist_add: 'Watchlist Add',
      watchlist_drop: 'Watchlist Drop',
      rebalance: 'Rebalance',
      other: 'Other'
    }

    return (
      <Badge variant="secondary" className={badges[type as keyof typeof badges]}>
        {labels[type as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Transaction Log</h1>
          <p className="text-muted-foreground mt-2">
            Track all your buy and sell transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium mb-1.5">
                Symbol
              </label>
              <Input
                id="symbol"
                value={symbolFilter}
                onChange={(e) => { setSymbolFilter(e.target.value.toUpperCase()); handleFilterChange() }}
                placeholder="e.g., AAPL"
              />
            </div>

            <div>
              <label htmlFor="account" className="block text-sm font-medium mb-1.5">
                Account
              </label>
              <select
                id="account"
                value={accountFilter}
                onChange={(e) => { setAccountFilter(e.target.value); handleFilterChange() }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1.5">
                Type
              </label>
              <select
                id="type"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); handleFilterChange() }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Types</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-1.5">
                Reason
              </label>
              <select
                id="reason"
                value={reasonFilter}
                onChange={(e) => { setReasonFilter(e.target.value); handleFilterChange() }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Reasons</option>
                <option value="watchlist_add">Watchlist Add</option>
                <option value="watchlist_drop">Watchlist Drop</option>
                <option value="rebalance">Rebalance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-1.5">
                Start Date
              </label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); handleFilterChange() }}
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-1.5">
                End Date
              </label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); handleFilterChange() }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Transactions</CardTitle>
            </div>
            {data && data.total > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {startRecord}-{endRecord} of {data.total}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-destructive">Failed to load transactions</p>
            </div>
          ) : !data || data.transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No transactions</h3>
              <p className="text-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Get started by creating a new transaction'}
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Shares
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.transactions.map((transaction) => {
                      const account = accountMap.get(transaction.account_id)
                      const watchlist = transaction.reason_watchlist_id ? watchlistMap.get(transaction.reason_watchlist_id) : null

                      return (
                        <tr key={transaction.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">
                            <Link to={`/positions/${transaction.symbol}`} className="text-primary hover:underline">
                              {transaction.symbol}
                            </Link>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {transaction.transaction_type === 'BUY' ? (
                              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                <ArrowUpRight className="mr-1 h-3 w-3" />
                                BUY
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                                <ArrowDownRight className="mr-1 h-3 w-3" />
                                SELL
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                            {transaction.shares.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                            ${transaction.price_per_share.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold">
                            ${(transaction.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {account?.name || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <div className="space-y-1">
                              {getReasonBadge(transaction.reason_type)}
                              {watchlist && (
                                <div className="text-xs text-muted-foreground">
                                  {watchlist.name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground max-w-xs">
                            <div className="truncate" title={transaction.reason_notes}>
                              {transaction.reason_notes || '-'}
                            </div>
                            {transaction.reason_url && (
                              <a
                                href={transaction.reason_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-xs inline-flex items-center gap-1 mt-1"
                              >
                                Source <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                            {deleteConfirm === transaction.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(transaction.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(transaction.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Transaction Modal */}
      <CreateTransactionDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        accounts={accounts}
        watchlists={watchlists}
        onSuccess={() => {
          setShowCreateModal(false)
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
          toast({
            title: 'Transaction created',
            description: 'Your transaction has been added to the log.',
          })
        }}
      />
    </div>
  )
}

// Create Transaction Dialog Component
interface CreateTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  watchlists: Watchlist[]
  onSuccess: () => void
}

function CreateTransactionDialog({ open, onOpenChange, accounts, watchlists, onSuccess }: CreateTransactionDialogProps) {
  const [formData, setFormData] = useState({
    account_id: '',
    symbol: '',
    transaction_type: 'BUY' as 'BUY' | 'SELL',
    shares: '',
    price_per_share: '',
    transaction_date: new Date().toISOString().split('T')[0],
    reason_type: '',
    reason_watchlist_id: '',
    reason_notes: '',
    reason_url: ''
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => transactionsApi.create(data),
    onSuccess: () => {
      onSuccess()
      // Reset form
      setFormData({
        account_id: '',
        symbol: '',
        transaction_type: 'BUY',
        shares: '',
        price_per_share: '',
        transaction_date: new Date().toISOString().split('T')[0],
        reason_type: '',
        reason_watchlist_id: '',
        reason_notes: '',
        reason_url: ''
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: any = {
      account_id: parseInt(formData.account_id),
      symbol: formData.symbol.toUpperCase(),
      transaction_type: formData.transaction_type,
      shares: parseFloat(formData.shares),
      price_per_share: parseFloat(formData.price_per_share),
      transaction_date: formData.transaction_date
    }

    if (formData.reason_type) payload.reason_type = formData.reason_type
    if (formData.reason_watchlist_id) payload.reason_watchlist_id = parseInt(formData.reason_watchlist_id)
    if (formData.reason_notes) payload.reason_notes = formData.reason_notes
    if (formData.reason_url) payload.reason_url = formData.reason_url

    createMutation.mutate(payload)
  }

  const totalAmount = formData.shares && formData.price_per_share
    ? parseFloat(formData.shares) * parseFloat(formData.price_per_share)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>
            Add a new buy or sell transaction to your log
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Account <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>

          {/* Symbol and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Symbol <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., AAPL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as 'BUY' | 'SELL' })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
          </div>

          {/* Shares, Price, and Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Shares <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                required
                min="0"
                step="any"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Price/Share <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price_per_share}
                onChange={(e) => setFormData({ ...formData, price_per_share: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              />
            </div>
          </div>

          {/* Total Amount Display */}
          {totalAmount > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
              <p className="text-sm">
                Total Amount: <span className="font-semibold">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          )}

          {/* Reason Type and Watchlist */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Reason
              </label>
              <select
                value={formData.reason_type}
                onChange={(e) => setFormData({ ...formData, reason_type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None</option>
                <option value="watchlist_add">Watchlist Add</option>
                <option value="watchlist_drop">Watchlist Drop</option>
                <option value="rebalance">Rebalance</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Related Watchlist
              </label>
              <select
                value={formData.reason_watchlist_id}
                onChange={(e) => setFormData({ ...formData, reason_watchlist_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None</option>
                {watchlists.map(watchlist => (
                  <option key={watchlist.id} value={watchlist.id}>{watchlist.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Notes
            </label>
            <textarea
              value={formData.reason_notes}
              onChange={(e) => setFormData({ ...formData, reason_notes: e.target.value })}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Optional notes about this transaction"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Source URL
            </label>
            <Input
              type="url"
              value={formData.reason_url}
              onChange={(e) => setFormData({ ...formData, reason_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Error display */}
          {createMutation.isError && (
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to create transaction'}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TransactionList
