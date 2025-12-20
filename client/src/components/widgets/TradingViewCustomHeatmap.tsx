interface WatchlistMember {
  symbol: string
  company_name?: string
  sector?: string
  total_shares: number
  total_cost_basis: number
  current_price: number | null
  current_value: number | null
}

interface TradingViewCustomHeatmapProps {
  members: WatchlistMember[]
  height?: number
}

export function TradingViewCustomHeatmap({ members, height = 400 }: TradingViewCustomHeatmapProps) {
  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground p-12">
        <p className="text-sm">No symbols in this watchlist</p>
      </div>
    )
  }

  // Calculate change % for each member
  const enrichedMembers = members.map(member => {
    const changePercent = member.current_price && member.total_cost_basis > 0
      ? ((member.current_value! - member.total_cost_basis) / member.total_cost_basis) * 100
      : null

    return {
      ...member,
      changePercent
    }
  })

  return (
    <div className="overflow-x-auto" style={{ maxHeight: height }}>
      <table className="w-full">
        <thead className="sticky top-0 bg-muted/50 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Company</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Shares</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Basis</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Current Price</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Change %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {enrichedMembers.map((member) => (
            <tr key={member.symbol} className="hover:bg-accent/50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="text-sm font-semibold text-primary">{member.symbol}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {member.company_name || '-'}
                </div>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-sm">{member.total_shares > 0 ? member.total_shares.toLocaleString() : '-'}</span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-medium">
                  {member.total_cost_basis > 0 ? `$${member.total_cost_basis.toLocaleString()}` : '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap hidden sm:table-cell">
                <span className="text-sm">
                  {member.current_price ? `$${member.current_price.toFixed(2)}` : '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {member.changePercent !== null ? (
                  <span className={`text-sm font-semibold ${
                    member.changePercent > 0
                      ? 'text-green-500'
                      : member.changePercent < 0
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  }`}>
                    {member.changePercent > 0 ? '+' : ''}{member.changePercent.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
