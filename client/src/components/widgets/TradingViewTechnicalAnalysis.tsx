import { useEffect, useRef } from 'react'

interface TradingViewTechnicalAnalysisProps {
  symbol: string
  height?: number
}

export function TradingViewTechnicalAnalysis({ symbol, height = 400 }: TradingViewTechnicalAnalysisProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      isTransparent: false,
      height: height,
      symbol: symbol, // Let TradingView auto-detect the exchange
      showIntervalTabs: true,
      locale: 'en',
      colorTheme: 'dark',
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbol, height])

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}
