import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Database,
  Download,
  Trash2,
  RefreshCw,
  Building2,
  List,
  Pencil,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useToast } from '../hooks/use-toast'
import { TypeConfirmDialog } from '../components/admin/TypeConfirmDialog'
import { adminApi, accountsAdminApi, watchlistsAdminApi, accountsApi, watchlistsApi } from '../services/api'

interface Account {
  id: number
  name: string
  broker: string | null
  account_number_suffix: string | null
  created_at: string
}

interface Watchlist {
  id: number
  name: string
  source: 'seeking_alpha' | 'motley_fool'
  dollar_allocation: number | null
  created_at: string
}

export default function Admin() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [lastBackup, setLastBackup] = useState<string | null>(
    localStorage.getItem('lastBackupTime')
  )

  // Fetch data
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll() as Promise<Account[]>,
  })

  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists'],
    queryFn: () => watchlistsApi.getAll() as Promise<Watchlist[]>,
  })

  // Dialog states
  const [deleteAccountDialog, setDeleteAccountDialog] = useState<Account | null>(null)
  const [deleteWatchlistDialog, setDeleteWatchlistDialog] = useState<Watchlist | null>(null)
  const [editAccountDialog, setEditAccountDialog] = useState<Account | null>(null)
  const [editWatchlistDialog, setEditWatchlistDialog] = useState<Watchlist | null>(null)
  const [createAccountDialog, setCreateAccountDialog] = useState(false)
  const [createWatchlistDialog, setCreateWatchlistDialog] = useState(false)
  const [cleanupDialog, setCleanupDialog] = useState<{
    type: 'orphans' | 'transactions' | 'cache' | 'purge'
    count: number
  } | null>(null)

  // Form states
  const [accountForm, setAccountForm] = useState({ name: '', broker: '', suffix: '' })
  const [watchlistForm, setWatchlistForm] = useState({
    name: '',
    source: 'seeking_alpha' as 'seeking_alpha' | 'motley_fool',
    allocation: ''
  })

  // Mutations
  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => accountsAdminApi.delete(id),
    onSuccess: (result) => {
      toast({
        title: 'Account deleted',
        description: `${result.deleted.account} and ${result.deleted.positions} positions deleted`,
      })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      refetchStats()
      setDeleteAccountDialog(null)
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteWatchlistMutation = useMutation({
    mutationFn: (id: number) => watchlistsAdminApi.delete(id),
    onSuccess: (result) => {
      toast({
        title: 'Watchlist deleted',
        description: `${result.deleted.watchlist} and ${result.deleted.ratings} ratings deleted`,
      })
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
      refetchStats()
      setDeleteWatchlistDialog(null)
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => accountsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Account created' })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setCreateAccountDialog(false)
      setAccountForm({ name: '', broker: '', suffix: '' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => accountsAdminApi.update(id, data),
    onSuccess: () => {
      toast({ title: 'Account updated' })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setEditAccountDialog(null)
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createWatchlistMutation = useMutation({
    mutationFn: (data: any) => watchlistsApi.create(data),
    onSuccess: () => {
      toast({ title: 'Watchlist created' })
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
      setCreateWatchlistDialog(false)
      setWatchlistForm({ name: '', source: 'seeking_alpha', allocation: '' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateWatchlistMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => watchlistsApi.update(id, data),
    onSuccess: () => {
      toast({ title: 'Watchlist updated' })
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
      setEditWatchlistDialog(null)
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const cleanupMutations = {
    orphans: useMutation({
      mutationFn: adminApi.deleteOrphanSymbols,
      onSuccess: (result) => {
        toast({ title: 'Cleanup complete', description: `Deleted ${result.deleted} orphan symbols` })
        refetchStats()
        setCleanupDialog(null)
      },
    }),
    transactions: useMutation({
      mutationFn: adminApi.clearTransactions,
      onSuccess: (result) => {
        toast({ title: 'Transactions cleared', description: `Deleted ${result.deleted} transactions` })
        refetchStats()
        setCleanupDialog(null)
      },
    }),
    cache: useMutation({
      mutationFn: adminApi.clearQuotesCache,
      onSuccess: (result) => {
        toast({ title: 'Cache cleared', description: `Cleared ${result.deleted} cached quotes` })
        refetchStats()
        setCleanupDialog(null)
      },
    }),
    purge: useMutation({
      mutationFn: adminApi.purgeRemovedMembers,
      onSuccess: (result) => {
        toast({ title: 'Members purged', description: `Purged ${result.deleted} removed members` })
        refetchStats()
        setCleanupDialog(null)
      },
    }),
  }

  const handleBackup = () => {
    adminApi.downloadBackup()
    const now = new Date().toISOString()
    localStorage.setItem('lastBackupTime', now)
    setLastBackup(now)
    toast({ title: 'Backup downloaded' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Database and system management</p>
      </div>

      {/* Database Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Backup
          </CardTitle>
          <CardDescription>
            Download a backup before making changes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Button onClick={handleBackup}>
            <Download className="mr-2 h-4 w-4" />
            Download Backup
          </Button>
          <span className="text-sm text-muted-foreground">
            Last backup: {lastBackup ? formatDate(lastBackup) : 'Never'}
          </span>
        </CardContent>
      </Card>

      {/* Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Accounts
            </CardTitle>
            <CardDescription>Manage brokerage accounts</CardDescription>
          </div>
          <Button onClick={() => setCreateAccountDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Suffix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.broker || '-'}</TableCell>
                  <TableCell>{account.account_number_suffix || '-'}</TableCell>
                  <TableCell>{formatDate(account.created_at)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAccountForm({
                          name: account.name,
                          broker: account.broker || '',
                          suffix: account.account_number_suffix || '',
                        })
                        setEditAccountDialog(account)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteAccountDialog(account)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Watchlists */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Watchlists
            </CardTitle>
            <CardDescription>Manage watchlists and allocations</CardDescription>
          </div>
          <Button onClick={() => setCreateWatchlistDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Watchlist
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {watchlists.map((watchlist) => (
                <TableRow key={watchlist.id}>
                  <TableCell className="font-medium">{watchlist.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {watchlist.source === 'seeking_alpha' ? 'Seeking Alpha' : 'Motley Fool'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {watchlist.dollar_allocation
                      ? `$${watchlist.dollar_allocation.toLocaleString()}`
                      : '-'}
                  </TableCell>
                  <TableCell>{formatDate(watchlist.created_at)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setWatchlistForm({
                          name: watchlist.name,
                          source: watchlist.source,
                          allocation: watchlist.dollar_allocation?.toString() || '',
                        })
                        setEditWatchlistDialog(watchlist)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteWatchlistDialog(watchlist)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Cleanup
          </CardTitle>
          <CardDescription>Remove test data and optimize database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Orphan Symbols</p>
              <p className="text-sm text-muted-foreground">
                Symbols with no positions and no watchlist membership
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{stats?.orphanSymbols ?? 0} found</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCleanupDialog({ type: 'orphans', count: stats?.orphanSymbols ?? 0 })}
                disabled={!stats?.orphanSymbols}
              >
                Clean Up
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Transactions</p>
              <p className="text-sm text-muted-foreground">Clear all transaction history</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{stats?.transactions ?? 0} records</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCleanupDialog({ type: 'transactions', count: stats?.transactions ?? 0 })}
                disabled={!stats?.transactions}
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <p className="font-medium">Quotes Cache</p>
              <p className="text-sm text-muted-foreground">
                Clear cached stock quotes (will re-fetch on demand)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{stats?.quotesCache ?? 0} cached</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutations.cache.mutate()}
                disabled={!stats?.quotesCache}
              >
                Clear Cache
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Removed Watchlist Members</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete soft-deleted watchlist members
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{stats?.removedMembers ?? 0} records</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutations.purge.mutate()}
                disabled={!stats?.removedMembers}
              >
                Purge
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      {deleteAccountDialog && (
        <TypeConfirmDialog
          open={!!deleteAccountDialog}
          onOpenChange={() => setDeleteAccountDialog(null)}
          title="Delete Account"
          description={`This will permanently delete "${deleteAccountDialog.name}" and all associated positions. This action cannot be undone.`}
          destructiveAction="Delete"
          onConfirm={() => deleteAccountMutation.mutate(deleteAccountDialog.id)}
          isLoading={deleteAccountMutation.isPending}
        />
      )}

      {/* Delete Watchlist Dialog */}
      {deleteWatchlistDialog && (
        <TypeConfirmDialog
          open={!!deleteWatchlistDialog}
          onOpenChange={() => setDeleteWatchlistDialog(null)}
          title="Delete Watchlist"
          description={`This will permanently delete "${deleteWatchlistDialog.name}" and all associated ratings. This action cannot be undone.`}
          destructiveAction="Delete"
          onConfirm={() => deleteWatchlistMutation.mutate(deleteWatchlistDialog.id)}
          isLoading={deleteWatchlistMutation.isPending}
        />
      )}

      {/* Cleanup Dialogs */}
      {cleanupDialog && (cleanupDialog.type === 'orphans' || cleanupDialog.type === 'transactions') && (
        <TypeConfirmDialog
          open={!!cleanupDialog}
          onOpenChange={() => setCleanupDialog(null)}
          title={cleanupDialog.type === 'orphans' ? 'Delete Orphan Symbols' : 'Clear Transactions'}
          description={
            cleanupDialog.type === 'orphans'
              ? `This will permanently delete ${cleanupDialog.count} orphan symbols.`
              : `This will permanently delete ${cleanupDialog.count} transaction records.`
          }
          destructiveAction={cleanupDialog.type === 'orphans' ? 'Clean Up' : 'Clear All'}
          onConfirm={() => {
            if (cleanupDialog.type === 'orphans') {
              cleanupMutations.orphans.mutate()
            } else {
              cleanupMutations.transactions.mutate()
            }
          }}
          isLoading={cleanupMutations.orphans.isPending || cleanupMutations.transactions.isPending}
        />
      )}

      {/* Edit Account Dialog */}
      <Dialog open={!!editAccountDialog} onOpenChange={() => setEditAccountDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="Jim's Roth IRA"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Broker</label>
              <Input
                value={accountForm.broker}
                onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })}
                placeholder="Schwab"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Suffix (last 4 digits)</label>
              <Input
                value={accountForm.suffix}
                onChange={(e) => setAccountForm({ ...accountForm, suffix: e.target.value })}
                placeholder="1234"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAccountDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editAccountDialog) {
                  updateAccountMutation.mutate({
                    id: editAccountDialog.id,
                    data: {
                      name: accountForm.name,
                      broker: accountForm.broker || null,
                      account_number_suffix: accountForm.suffix || null,
                    },
                  })
                }
              }}
              disabled={!accountForm.name || updateAccountMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={createAccountDialog} onOpenChange={setCreateAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="Jim's Roth IRA"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Broker</label>
              <Input
                value={accountForm.broker}
                onChange={(e) => setAccountForm({ ...accountForm, broker: e.target.value })}
                placeholder="Schwab"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Suffix (last 4 digits)</label>
              <Input
                value={accountForm.suffix}
                onChange={(e) => setAccountForm({ ...accountForm, suffix: e.target.value })}
                placeholder="1234"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccountDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createAccountMutation.mutate({
                  name: accountForm.name,
                  broker: accountForm.broker || null,
                  account_number_suffix: accountForm.suffix || null,
                })
              }}
              disabled={!accountForm.name || createAccountMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Watchlist Dialog */}
      <Dialog open={!!editWatchlistDialog} onOpenChange={() => setEditWatchlistDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Watchlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Watchlist Name *</label>
              <Input
                value={watchlistForm.name}
                onChange={(e) => setWatchlistForm({ ...watchlistForm, name: e.target.value })}
                placeholder="Alpha Picks"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dollar Allocation</label>
              <Input
                type="number"
                value={watchlistForm.allocation}
                onChange={(e) => setWatchlistForm({ ...watchlistForm, allocation: e.target.value })}
                placeholder="15000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWatchlistDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editWatchlistDialog) {
                  updateWatchlistMutation.mutate({
                    id: editWatchlistDialog.id,
                    data: {
                      name: watchlistForm.name,
                      dollar_allocation: watchlistForm.allocation
                        ? parseFloat(watchlistForm.allocation)
                        : null,
                    },
                  })
                }
              }}
              disabled={!watchlistForm.name || updateWatchlistMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Watchlist Dialog */}
      <Dialog open={createWatchlistDialog} onOpenChange={setCreateWatchlistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Watchlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Watchlist Name *</label>
              <Input
                value={watchlistForm.name}
                onChange={(e) => setWatchlistForm({ ...watchlistForm, name: e.target.value })}
                placeholder="Alpha Picks"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source *</label>
              <Select
                value={watchlistForm.source}
                onValueChange={(value: 'seeking_alpha' | 'motley_fool') =>
                  setWatchlistForm({ ...watchlistForm, source: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeking_alpha">Seeking Alpha</SelectItem>
                  <SelectItem value="motley_fool">Motley Fool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dollar Allocation</label>
              <Input
                type="number"
                value={watchlistForm.allocation}
                onChange={(e) => setWatchlistForm({ ...watchlistForm, allocation: e.target.value })}
                placeholder="15000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWatchlistDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createWatchlistMutation.mutate({
                  name: watchlistForm.name,
                  source: watchlistForm.source,
                  dollar_allocation: watchlistForm.allocation
                    ? parseFloat(watchlistForm.allocation)
                    : null,
                })
              }}
              disabled={!watchlistForm.name || createWatchlistMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
