import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built with Portfolio Tracker
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/import"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Help
          </Link>
          <span className="text-muted-foreground">·</span>
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </a>
        </div>
      </div>
    </footer>
  )
}
