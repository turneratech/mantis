/**
 * Storage Factory — MySQL, PostgreSQL/Supabase, or CSV
 */

const deploymentConfig = require('../config/deployment.config');

let storage = null;
let storageType = null;
let initialized = false;

const tryMySQL = async () => {
  const mysqlStorage = require('./mysql');
  const { testConnection, checkDatabase } = require('./mysql/db');
  if (!(await testConnection())) return null;
  if (!(await checkDatabase())) {
    console.log('⚠ MySQL connected but tables not found — run server/database/mantis.sql');
    return null;
  }
  return mysqlStorage;
};

const tryPostgres = async () => {
  const postgresStorage = require('./postgres');
  const { testConnection, checkDatabase } = require('./postgres/db');
  if (!(await testConnection())) return null;
  if (!(await checkDatabase())) {
    console.log('⚠ PostgreSQL connected but schema not found — run server/database/mantis.postgres.sql');
    return null;
  }
  return postgresStorage;
};

const initializeStorage = async () => {
  if (initialized && storage) return storage;

  const provider = deploymentConfig.getDatabaseProvider();
  console.log(`🔍 Detecting storage backend (provider: ${provider})...`);

  if (provider === 'csv') {
    const csvStorage = require('./csv');
    await csvStorage.initialize();
    storage = csvStorage;
    storageType = 'csv';
    initialized = true;
    console.log('✓ Using CSV storage backend');
    return storage;
  }

  if (provider === 'postgres' || provider === 'supabase') {
    try {
      const pg = await tryPostgres();
      if (pg) {
        storage = pg;
        storageType = 'postgres';
        initialized = true;
        console.log('✓ Using PostgreSQL storage backend');
        return storage;
      }
      if (provider === 'postgres' || provider === 'supabase') {
        throw new Error('PostgreSQL/Supabase required but connection or schema check failed.');
      }
    } catch (err) {
      if (provider === 'postgres' || provider === 'supabase') throw err;
      console.log('⚠ PostgreSQL not available:', err.message);
    }
  }

  if (['mysql', 'auto', 'postgres', 'supabase'].includes(provider)) {
    try {
      const mysqlStorage = await tryMySQL();
      if (mysqlStorage) {
        storage = mysqlStorage;
        storageType = 'mysql';
        initialized = true;
        console.log('✓ Using MySQL storage backend');
        return storage;
      }
      if (provider === 'mysql') {
        throw new Error('MySQL required but connection or schema check failed.');
      }
    } catch (err) {
      if (provider === 'mysql') throw err;
      console.log('⚠ MySQL not available:', err.message);
    }
  }

  console.log('↪ Falling back to CSV storage backend');
  const csvStorage = require('./csv');
  await csvStorage.initialize();
  storage = csvStorage;
  storageType = 'csv';
  initialized = true;
  console.log('✓ Using CSV storage backend');
  return storage;
};

const getStorage = () => {
  if (!storage) throw new Error('Storage not initialized. Call initializeStorage() first.');
  return storage;
};

const getStorageType = () => storageType;
const isSqlStorage = () => storageType === 'mysql' || storageType === 'postgres';
const isInitialized = () => initialized;

const resetStorage = () => {
  storage = null;
  storageType = null;
  initialized = false;
};

module.exports = {
  initializeStorage,
  getStorage,
  getStorageType,
  isSqlStorage,
  isInitialized,
  resetStorage,

  getUserById: (...args) => getStorage().getUserById(...args),
  getUserByUsername: (...args) => getStorage().getUserByUsername(...args),
  getAllUsers: (...args) => getStorage().getAllUsers(...args),
  createUser: (...args) => getStorage().createUser(...args),
  deleteUser: (...args) => getStorage().deleteUser(...args),
  updateUserPassword: (...args) => getStorage().updateUserPassword(...args),

  getAllProjects: (...args) => getStorage().getAllProjects(...args),
  getProjectById: (...args) => getStorage().getProjectById(...args),
  getProjectByKey: (...args) => getStorage().getProjectByKey(...args),
  createProject: (...args) => getStorage().createProject(...args),
  updateProject: (...args) => getStorage().updateProject(...args),
  deleteProject: (...args) => getStorage().deleteProject(...args),
  addProjectMember: (...args) => getStorage().addProjectMember(...args),
  removeProjectMember: (...args) => getStorage().removeProjectMember(...args),

  getAllBugs: (...args) => getStorage().getAllBugs(...args),
  getBugsByProject: (...args) => getStorage().getBugsByProject(...args),
  getBugsByUser: (...args) => getStorage().getBugsByUser(...args),
  getBugById: (...args) => getStorage().getBugById(...args),
  generateBugId: (...args) => getStorage().generateBugId(...args),
  createBug: (...args) => getStorage().createBug(...args),
  updateBug: (...args) => getStorage().updateBug(...args),
  deleteBug: (...args) => getStorage().deleteBug(...args),
  addBugComment: (...args) => getStorage().addBugComment(...args),
  getBugStats: (...args) => getStorage().getBugStats(...args),
  addBugActivity: (...args) => getStorage().addBugActivity(...args),

  getAdminAnalytics: (...args) => getStorage().getAdminAnalytics(...args),
  getUserDashboard: (...args) => getStorage().getUserDashboard(...args)
};
