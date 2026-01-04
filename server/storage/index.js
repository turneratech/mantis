/**
 * Storage Factory
 * 
 * Automatically detects and initializes the appropriate storage backend.
 * Tries MySQL first, falls back to CSV if MySQL is not available.
 */

let storage = null;
let storageType = null;
let initialized = false;

/**
 * Detect and initialize storage backend
 * @returns {Promise<Object>} Storage implementation
 */
const initializeStorage = async () => {
  if (initialized && storage) {
    return storage;
  }

  console.log('🔍 Detecting storage backend...');

  // Try MySQL first
  try {
    const mysqlStorage = require('./mysql');
    const { testConnection, checkDatabase } = require('./mysql/db');
    
    // Test MySQL connection
    const connected = await testConnection();
    
    if (connected) {
      // Check if tables exist
      const tablesExist = await checkDatabase();
      
      if (tablesExist) {
        storage = mysqlStorage;
        storageType = 'mysql';
        initialized = true;
        console.log('✓ Using MySQL storage backend');
        return storage;
      } else {
        console.log('⚠ MySQL connected but tables not found');
        console.log('  Run: mysql -u root -p bugtracker < server/database/schema.sql');
      }
    } else {
      console.log('⚠ MySQL connection failed');
    }
  } catch (error) {
    console.log('⚠ MySQL not available:', error.message);
  }

  // Fall back to CSV
  console.log('↪ Falling back to CSV storage backend');
  
  const csvStorage = require('./csv');
  await csvStorage.initialize();
  
  storage = csvStorage;
  storageType = 'csv';
  initialized = true;
  console.log('✓ Using CSV storage backend');
  
  return storage;
};

/**
 * Get current storage instance
 * @returns {Object} Storage implementation
 */
const getStorage = () => {
  if (!storage) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storage;
};

/**
 * Get current storage type
 * @returns {string} 'mysql' or 'csv'
 */
const getStorageType = () => {
  return storageType;
};

/**
 * Check if storage is initialized
 * @returns {boolean}
 */
const isInitialized = () => {
  return initialized;
};

/**
 * Reset storage (for testing purposes)
 */
const resetStorage = () => {
  storage = null;
  storageType = null;
  initialized = false;
};

// Export both factory functions and proxy to storage methods
module.exports = {
  initializeStorage,
  getStorage,
  getStorageType,
  isInitialized,
  resetStorage,
  
  // Proxy all storage methods for convenience
  // These will throw if storage is not initialized
  
  // Users
  getUserById: (...args) => getStorage().getUserById(...args),
  getUserByUsername: (...args) => getStorage().getUserByUsername(...args),
  getAllUsers: (...args) => getStorage().getAllUsers(...args),
  createUser: (...args) => getStorage().createUser(...args),
  deleteUser: (...args) => getStorage().deleteUser(...args),
  updateUserPassword: (...args) => getStorage().updateUserPassword(...args),
  
  // Projects
  getAllProjects: (...args) => getStorage().getAllProjects(...args),
  getProjectById: (...args) => getStorage().getProjectById(...args),
  getProjectByKey: (...args) => getStorage().getProjectByKey(...args),
  createProject: (...args) => getStorage().createProject(...args),
  updateProject: (...args) => getStorage().updateProject(...args),
  deleteProject: (...args) => getStorage().deleteProject(...args),
  addProjectMember: (...args) => getStorage().addProjectMember(...args),
  removeProjectMember: (...args) => getStorage().removeProjectMember(...args),
  
  // Bugs
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
  
  // NEW proxy for GitHub webhook
  addBugActivity: (...args) => getStorage().addBugActivity(...args),
  
  // Analytics
  getAdminAnalytics: (...args) => getStorage().getAdminAnalytics(...args),
  getUserDashboard: (...args) => getStorage().getUserDashboard(...args)
};
