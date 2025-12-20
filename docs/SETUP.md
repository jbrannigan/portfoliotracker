# Development Setup Guide

## Prerequisites

### macOS Development Machine

- **macOS:** Ventura (13.x) or newer recommended
- **Homebrew:** Package manager for macOS
- **Node.js:** v20 LTS or newer
- **npm:** v10 or newer (comes with Node.js)

### Install Prerequisites

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js via Homebrew
brew install node

# Verify installation
node --version  # Should be v20.x or higher
npm --version   # Should be v10.x or higher
```

---

## Project Structure

```
portfolio-tracker/
├── README.md
├── package.json              # Root workspace config
├── .env.example              # Environment template
├── .gitignore
│
├── server/                   # Backend (Node.js + Express)
│   ├── package.json
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── db/               # SQLite + migrations
│   │   ├── importers/        # CSV/Excel parsers
│   │   └── types/            # TypeScript types
│   └── tsconfig.json
│
├── client/                   # Frontend (React + Vite)
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx          # Entry point
│   │   ├── App.tsx           # Root component
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript types
│   ├── public/
│   │   └── manifest.json     # PWA manifest
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── shared/                   # Shared types/utilities
│   ├── package.json
│   └── src/
│       ├── types.ts          # Shared TypeScript types
│       └── utils.ts          # Shared utilities
│
└── docs/                     # Documentation
    ├── DATA_MODEL.md
    ├── IMPORT_FORMATS.md
    └── SETUP.md
```

---

## Initial Setup

### 1. Create Project Directory

```bash
mkdir portfolio-tracker
cd portfolio-tracker
git init
```

### 2. Create Root package.json

```bash
cat > package.json << 'EOF'
{
  "name": "portfolio-tracker",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "server",
    "client",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev -w server",
    "dev:client": "npm run dev -w client",
    "build": "npm run build -w shared && npm run build -w server && npm run build -w client",
    "start": "npm run start -w server",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "typescript": "^5.3.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0"
  }
}
EOF
```

### 3. Create Server Package

```bash
mkdir -p server/src/{routes,services,db,importers,types}

cat > server/package.json << 'EOF'
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "better-sqlite3": "^9.4.0",
    "dotenv": "^16.4.0",
    "xlsx": "^0.18.5",
    "csv-parse": "^5.5.3",
    "node-fetch": "^3.3.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0"
  }
}
EOF

cat > server/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 4. Create Client Package

```bash
mkdir -p client/src/{components,pages,hooks,services,types}
mkdir -p client/public

cat > client/package.json << 'EOF'
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "lucide-react": "^0.309.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.11",
    "vite-plugin-pwa": "^0.17.4",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1"
  }
}
EOF

cat > client/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Portfolio Tracker',
        short_name: 'PortTrack',
        description: 'Track investment positions and ratings',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
EOF

cat > client/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat > client/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

cat > client/tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

cat > client/postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF
```

### 5. Create Shared Package

```bash
mkdir -p shared/src

cat > shared/package.json << 'EOF'
{
  "name": "shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

cat > shared/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 6. Environment Configuration

```bash
cat > .env.example << 'EOF'
# Server Configuration
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/portfolio.db

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Cache Settings (seconds)
QUOTE_CACHE_TTL=900

# Development
NODE_ENV=development
EOF

cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/
*.tsbuildinfo

# Environment
.env
.env.local

# Database
data/
*.db

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
EOF
```

### 7. Install Dependencies

```bash
npm install
```

---

## Running the Application

### Development Mode

```bash
# Start both server and client with hot reload
npm run dev
```

- **Server:** http://localhost:3001
- **Client:** http://localhost:5173
- **API proxy:** Client requests to /api/* are proxied to server

### Production Build

```bash
# Build all packages
npm run build

# Start production server (serves client build)
npm start
```

---

## Accessing from iPad

### Find Your Mac's IP Address

```bash
# Get local IP
ipconfig getifaddr en0
```

### Configure Server for Network Access

The server is configured to listen on `0.0.0.0` (all interfaces) by default.

### Connect from iPad

1. Ensure iPad is on same WiFi network
2. Open Safari on iPad
3. Navigate to `http://<mac-ip>:5173` (dev) or `http://<mac-ip>:3001` (prod)
4. Add to Home Screen for PWA experience

### Optional: mDNS Access

If your Mac has a hostname configured:
```bash
# Access via Bonjour name
http://your-mac-name.local:5173
```

---

## Alpha Vantage API Setup

### Get Free API Key

1. Go to https://www.alphavantage.co/support/#api-key
2. Enter email and get free API key
3. Add to `.env` file:
   ```
   ALPHA_VANTAGE_API_KEY=your_key_here
   ```

### Rate Limits (Free Tier)

- 25 requests per day
- 5 requests per minute

### Recommended Strategy

1. Cache quotes for 15 minutes minimum
2. Batch quote requests where possible
3. Use "GLOBAL_QUOTE" endpoint for current prices
4. Use "OVERVIEW" endpoint for fundamentals (once per day)

---

## Database Management

### Location

```bash
# Default location
./data/portfolio.db
```

### Backup

```bash
# Create backup
cp ./data/portfolio.db ./data/portfolio-backup-$(date +%Y%m%d).db
```

### Reset Database

```bash
# Delete and recreate
rm ./data/portfolio.db
npm run dev  # Server will create fresh database
```

### SQLite CLI Access

```bash
# Install sqlite3 if needed
brew install sqlite

# Access database
sqlite3 ./data/portfolio.db

# Common commands
.tables           # List tables
.schema symbols   # Show table schema
.quit             # Exit
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Node Version Issues

```bash
# Check version
node --version

# If wrong version, use nvm
brew install nvm
nvm install 20
nvm use 20
```

### Excel Parsing Issues

The xlsx library may have issues with non-standard Excel files. See `docs/IMPORT_FORMATS.md` for the XML extraction workaround.

### iPad Can't Connect

1. Check both devices on same network
2. Check macOS firewall settings (System Preferences → Security & Privacy → Firewall)
3. Verify server is listening: `curl http://localhost:3001/api/health`
