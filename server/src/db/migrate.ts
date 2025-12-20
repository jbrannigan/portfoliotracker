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
 * Run incremental migrations for schema changes
 */
function runIncrementalMigrations() {
  // Migration: Add exchange column to quotes_cache
  if (!columnExists('quotes_cache', 'exchange')) {
    console.log('  Adding exchange column to quotes_cache...');
    db.exec('ALTER TABLE quotes_cache ADD COLUMN exchange TEXT');
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
