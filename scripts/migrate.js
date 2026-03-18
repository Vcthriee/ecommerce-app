
// Database migration runner
// Executes SQL files in order to set up schema

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

// Migration files directory
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

// Table to track which migrations ran
const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Initialize migrations tracking table
    await client.query(INIT_SQL);
    
    // Get list of already executed migrations
    const executedResult = await client.query('SELECT filename FROM migrations');
    const executed = new Set(executedResult.rows.map(r => r.filename));
    
    // Read all .sql files in migrations directory
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical order (001, 002, etc.)
    
    console.log(`Found ${files.length} migration files`);
    
    for (const file of files) {
      if (executed.has(file)) {
        console.log(`Skipping (already executed): ${file}`);
        continue;
      }
      
      // Read and execute SQL file
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Executing: ${file}`);
      await client.query(sql);
      
      // Record migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );
      
      console.log(`Completed: ${file}`);
    }
    
    console.log('All migrations finished');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };