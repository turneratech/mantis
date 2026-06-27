/**
 * Portal PostgreSQL pool — use Supabase connection string (Session or Transaction pooler).
 */
const { Pool } = require('pg');

let pool = null;

const getPool = () => {
  if (pool) return pool;

  const connectionString = process.env.PORTAL_DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('PORTAL_DATABASE_URL (or SUPABASE_DB_URL) is not configured');
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    max: 10
  });

  pool.on('error', (err) => {
    console.error('[Portal DB] Unexpected pool error:', err.message);
  });

  return pool;
};

const isDatabaseEnabled = () =>
  !!(process.env.PORTAL_DATABASE_URL || process.env.SUPABASE_DB_URL);

const query = async (text, params) => {
  const result = await getPool().query(text, params);
  return result.rows;
};

const queryOne = async (text, params) => {
  const rows = await query(text, params);
  return rows[0] || null;
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = { isDatabaseEnabled, query, queryOne, closePool };
