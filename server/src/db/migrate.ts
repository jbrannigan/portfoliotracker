import { db } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if a column exists in a table
 */
function columnExists(tableName: string, columnName: string): boolean {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  return info.some(col => col.name === columnName);
}

/**
 * Check if a table exists
 */
function tableExists(tableName: string): boolean {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName) as { name: string } | undefined;
  return result !== undefined;
}

/**
 * Run incremental migrations for schema changes
 */
function runIncrementalMigrations() {
  // Migration: Add exchange column to quotes_cache
  if (!columnExists('quotes_cache', 'exchange')) {
    console.log('  Adding exchange column to quotes_cache...');
    db.exec('ALTER TABLE quotes_cache ADD COLUMN exchange TEXT');
  }

  // Migration: Add status column to positions table
  if (!columnExists('positions', 'status')) {
    console.log('  Adding status column to positions...');
    db.exec("ALTER TABLE positions ADD COLUMN status TEXT NOT NULL DEFAULT 'open'");
  }

  // Migration: Add closed_at column to positions table
  if (!columnExists('positions', 'closed_at')) {
    console.log('  Adding closed_at column to positions...');
    db.exec('ALTER TABLE positions ADD COLUMN closed_at TEXT');
  }

  // Migration: Create position_watchlist_links table if not exists
  if (!tableExists('position_watchlist_links')) {
    console.log('  Creating position_watchlist_links table...');
    db.exec(`
      CREATE TABLE position_watchlist_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
        watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped')),
        linked_at TEXT NOT NULL DEFAULT (datetime('now')),
        dropped_at TEXT,
        UNIQUE(position_id, watchlist_id)
      );
      CREATE INDEX idx_position_watchlist_links_position ON position_watchlist_links(position_id);
      CREATE INDEX idx_position_watchlist_links_watchlist ON position_watchlist_links(watchlist_id);
      CREATE INDEX idx_position_watchlist_links_status ON position_watchlist_links(status);
    `);

    // Data migration: Link existing positions to watchlists based on symbol membership
    console.log('  Migrating existing position-watchlist links...');
    const migrationResult = db.exec(`
      INSERT INTO position_watchlist_links (position_id, watchlist_id, status, linked_at, dropped_at)
      SELECT DISTINCT
        p.id,
        wm.watchlist_id,
        CASE WHEN wm.removed_at IS NULL THEN 'active' ELSE 'dropped' END,
        COALESCE(wm.added_at, datetime('now')),
        wm.removed_at
      FROM positions p
      JOIN watchlist_members wm ON p.symbol = wm.symbol
      WHERE NOT EXISTS (
        SELECT 1 FROM position_watchlist_links pwl
        WHERE pwl.position_id = p.id AND pwl.watchlist_id = wm.watchlist_id
      )
    `);

    const linkCount = db.prepare('SELECT COUNT(*) as count FROM position_watchlist_links').get() as { count: number };
    console.log(`  Created ${linkCount.count} position-watchlist links`);
  }
}

export function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement);
      }
    })();

    // Run incremental migrations for existing databases
    runIncrementalMigrations();

    console.log('Database migrations completed successfully');

    // Log table count
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();

    console.log(`Tables created: ${tables.map((t: any) => t.name).join(', ')}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Auto-run migrations on import
runMigrations();
