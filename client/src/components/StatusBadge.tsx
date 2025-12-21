import { cn } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown, X, Check } from 'lucide-react'

export type StatusType = 'buy' | 'buy_more' | 'sell_some' | 'dropped' | 'sold' | 'on_target'

interface StatusBadgeProps {
  status: StatusType
  className?: string
  showIcon?: boolean
}

const statusConfig: Record<StatusType, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}> = {
  buy: {
    label: 'BUY',
    icon: Plus,
    className: 'bg-green-600 text-white border-green-600'
  },
  buy_more: {
    label: 'BUY MORE',
    icon: TrendingUp,
    className: 'bg-transparent text-green-500 border-green-500'
  },
  sell_some: {
    label: 'SELL SOME',
    icon: TrendingDown,
    className: 'bg-transparent text-amber-500 border-amber-500'
  },
  dropped: {
    label: 'DROPPED',
    icon: X,
    className: 'bg-red-600 text-white border-red-600'
  },
  sold: {
    label: 'SOLD',
    icon: Check,
    className: 'bg-gray-600 text-white border-gray-600'
  },
  on_target: {
    label: 'ON TARGET',
    icon: Check,
    className: 'bg-transparent text-muted-foreground border-muted'
  }
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  )
}

/**
 * Determine which status badges to show for a position
 */
export function getPositionStatuses(params: {
  hasDroppedLinks: boolean
  allocationStatus?: 'at_target' | 'underweight' | 'overweight' | 'no_position' | 'n/a'
  positionStatus: 'open' | 'closed'
}): StatusType[] {
  const statuses: StatusType[] = []

  // Show SOLD for closed positions
  if (params.positionStatus === 'closed') {
    statuses.push('sold')
    return statuses
  }

  // Show DROPPED if any linked watchlist dropped the symbol
  if (params.hasDroppedLinks) {
    statuses.push('dropped')
  }

  // Show allocation status badges
  if (params.allocationStatus === 'no_position') {
    statuses.push('buy')
  } else if (params.allocationStatus === 'underweight') {
    statuses.push('buy_more')
  } else if (params.allocationStatus === 'overweight') {
    statuses.push('sell_some')
  }
  // Note: 'at_target' and 'n/a' don't get badges

  return statuses
}
