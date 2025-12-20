import { useEffect, useRef } from 'react'

interface TradingViewTickerTapeProps {
  symbols?: Array<{
    proName: string
    title: string
  }>
}

export function TradingViewTickerTape({ symbols }: TradingViewTickerTapeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const defaultSymbols = [
    { proName: 'NASDAQ:AAPL', title: 'Apple' },
    { proName: 'NASDAQ:MSFT', title: 'Microsoft' },
    { proName: 'NASDAQ:GOOGL', title: 'Alphabet' },
    { proName: 'NASDAQ:AMZN', title: 'Amazon' },
    { proName: 'NASDAQ:NVDA', title: 'NVIDIA' },
    { proName: 'NASDAQ:TSLA', title: 'Tesla' },
    { proName: 'NASDAQ:META', title: 'Meta' },
    { proName: 'NYSE:BRK.B', title: 'Berkshire' },
  ]

  useEffect(() => {
    if (!containerRef.current) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: symbols || defaultSymbols,
      showSymbolLogo: true,
      colorTheme: 'dark',
      isTransparent: false,
      displayMode: 'adaptive',
      locale: 'en',
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [symbols])

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}
