import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command'
import {
  Home,
  TrendingUp,
  Wallet,
  Star,
  History,
  Upload,
  Search,
  FileText
} from 'lucide-react'

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const handleSelect = (callback: () => void) => {
    onOpenChange(false)
    callback()
  }

  // Quick actions
  const quickActions = [
    {
      icon: Home,
      label: 'Dashboard',
      action: () => navigate('/'),
    },
    {
      icon: TrendingUp,
      label: 'View Positions',
      action: () => navigate('/positions'),
    },
    {
      icon: Wallet,
      label: 'View Accounts',
      action: () => navigate('/accounts'),
    },
    {
      icon: Star,
      label: 'View Watchlists',
      action: () => navigate('/watchlists'),
    },
    {
      icon: History,
      label: 'Transaction Log',
      action: () => navigate('/transactions'),
    },
    {
      icon: Upload,
      label: 'Import Data',
      action: () => navigate('/import'),
    },
  ]

  // Popular stocks for empty state
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
  ]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search symbols or navigate..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Search className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching for a stock symbol or navigation item
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <CommandItem
                key={action.label}
                onSelect={() => handleSelect(action.action)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Popular Stocks - shown when empty or searching */}
        {(!searchQuery || searchQuery.length < 2) && (
          <CommandGroup heading="Popular Stocks">
            {popularStocks.map((stock) => (
              <CommandItem
                key={stock.symbol}
                onSelect={() =>
                  handleSelect(() => navigate(`/positions/${stock.symbol}`))
                }
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                <span className="font-medium">{stock.symbol}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {stock.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Search Results - would query API when searchQuery has 2+ chars */}
        {searchQuery && searchQuery.length >= 2 && (
          <CommandGroup heading="Search Results">
            <CommandItem
              onSelect={() =>
                handleSelect(() => navigate(`/positions/${searchQuery.toUpperCase()}`))
              }
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search for </span>
              <span className="font-medium ml-1">{searchQuery.toUpperCase()}</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Help & Documentation */}
        <CommandGroup heading="Help">
          <CommandItem>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documentation</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
