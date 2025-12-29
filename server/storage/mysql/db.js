const mysql = require('mysql2/promise');

let pool = null;

// Create connection pool
const createPool = () => {
  if (pool) return pool;
  
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bugtracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
  
  return pool;
};

// Get pool instance
const getPool = () => {
  if (!pool) createPool();
  return pool;
};

// Execute query
const query = async (sql, params = []) => {
  const [rows] = await getPool().execute(sql, params);
  return rows;
};

// Get single row
const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

// Transaction helper
const transaction = async (callback) => {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Test connection
const testConnection = async () => {
  try {
    const connection = await getPool().getConnection();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
};

// Check if database and tables exist
const checkDatabase = async () => {
  try {
    // Try to query the users table
    await query('SELECT 1 FROM users LIMIT 1');
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  createPool,
  getPool,
  query,
  queryOne,
  transaction,
  testConnection,
  checkDatabase
};
