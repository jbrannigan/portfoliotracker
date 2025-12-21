import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { Toaster } from './components/ui/toaster'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { SearchCommand } from './components/SearchCommand'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OfflineIndicator } from './components/OfflineIndicator'
import Dashboard from './pages/Dashboard'
import PositionList from './pages/PositionList'
import PositionDetail from './pages/PositionDetail'
import AccountList from './pages/AccountList'
import AccountDetail from './pages/AccountDetail'
import WatchlistList from './pages/WatchlistList'
import WatchlistDetail from './pages/WatchlistDetail'
import TransactionList from './pages/TransactionList'
import Import from './pages/Import'
import Admin from './pages/Admin'

function App() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* Header with Navigation */}
        <Header onSearchClick={() => setSearchOpen(true)} />

        {/* Search Command Palette */}
        <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

        {/* Main Content */}
        <main className="flex-1 container px-4 md:px-6 lg:px-8 py-6">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/positions" element={<PositionList />} />
              <Route path="/positions/:symbol" element={<PositionDetail />} />
              <Route path="/accounts" element={<AccountList />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              <Route path="/watchlists" element={<WatchlistList />} />
              <Route path="/watchlists/:id" element={<WatchlistDetail />} />
              <Route path="/transactions" element={<TransactionList />} />
              <Route path="/import" element={<Import />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <Footer />
      </div>
      <Toaster />
      <OfflineIndicator />
    </ThemeProvider>
  )
}

export default App
