import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string
  height?: number
}

export function TradingViewChart({ symbol, height = 500 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol, // Let TradingView auto-detect the exchange
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: false,
      support_host: 'https://www.tradingview.com',
      container_id: `tradingview_${symbol}`,
      toolbar_bg: '#1e1e1e',
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      details: true,
      hotlist: false,
      calendar: false,
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol])

  return (
    <div className="tradingview-widget-container" style={{ height }}>
      <div ref={containerRef} id={`tradingview_${symbol}`} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
