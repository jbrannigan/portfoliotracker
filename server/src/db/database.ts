import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from environment or use default
const DB_PATH = process.env.DATABASE_PATH || './data/portfolio.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Configure for better performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

console.log(`Database initialized at: ${DB_PATH}`);

// Export helper function to close database (for testing)
export const closeDatabase = () => {
  db.close();
};

export default db;
