// Load environment variables from .env file (local development)
// In production (ECS), environment variables come from the task definition
require('dotenv').config();

// Import PostgreSQL client from node-postgres library
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_PROXY_ENDPOINT || process.env.DB_HOST || 'db',
  port: 5432,
  database: process.env.DB_NAME || 'infra_modules',
  user: process.env.DB_USERNAME || 'dbadmin',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // SSL: Enable if DB_PROXY_ENDPOINT is set (AWS RDS Proxy requires TLS)
  ssl: process.env.DB_PROXY_ENDPOINT 
    ? { rejectUnauthorized: false }
    : false
});

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};