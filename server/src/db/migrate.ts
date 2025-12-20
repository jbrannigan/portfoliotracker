import { db } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
