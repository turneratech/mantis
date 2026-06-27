/**
 * First-run setup — unauthenticated bootstrap until setupComplete is set.
 * Website portal accounts are separate; the instance admin is created here.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const deploymentConfig = require('../config/deployment.config');
const deploymentSettingsService = require('./deploymentSettingsService');
const connectionTestService = require('./connectionTestService');
const storage = require('../storage');
const { generateToken } = require('../middleware/auth');

const setupError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const isSetupComplete = () =>
  deploymentConfig.reloadLocalConfig().setupComplete === true;

const assertSetupOpen = () => {
  if (isSetupComplete()) throw setupError('Setup already completed', 403);
};

const getInstanceId = () => {
  const local = deploymentConfig.reloadLocalConfig();
  if (local.instanceId) return local.instanceId;
  const id = crypto.randomUUID();
  deploymentConfig.saveLocalConfig({ instanceId: id });
  return id;
};

const hasPrivilegedUser = async () => {
  const users = await storage.getAllUsers();
  return users.some(u => u.role === 'admin' || u.role === 'godmode');
};

const getSetupStatus = async () => {
  const local = deploymentConfig.reloadLocalConfig();
  const setupComplete = local.setupComplete === true;
  const needsBootstrapAdmin = !(await hasPrivilegedUser());
  const needsSetup = !setupComplete;

  let license = { tier: 'community', status: 'active' };
  try {
    const licenseService = require('./licenseService');
    license = await licenseService.getLicenseStatus();
  } catch (_) {
    /* community default */
  }

  const dbType = storage.getStorageType();
  const dbConnected = dbType !== 'csv'
    && await storage.getStorage().isConnected().catch(() => false);

  const databaseOk = dbConnected && dbType !== 'csv';
  const licenseOk = !!local.activatedLicenseKey
    || !!(license.email || license.licensee)
    || local.licenseSkipped === true;

  return {
    needsSetup,
    setupComplete,
    needsBootstrapAdmin,
    instanceId: getInstanceId(),
    steps: {
      admin: { complete: !needsBootstrapAdmin },
      database: { complete: databaseOk, provider: dbType, connected: dbConnected },
      storage: { complete: true, default: deploymentConfig.getFileStorageConfig().default },
      license: {
        complete: licenseOk,
        tier: license.tier,
        skipped: local.licenseSkipped === true
      }
    }
  };
};

const bootstrapAdmin = async ({ username, password, email }) => {
  assertSetupOpen();

  if (await hasPrivilegedUser()) {
    throw setupError('An administrator account already exists', 409);
  }

  const name = (username || '').trim();
  if (!name || name.length < 3) {
    throw setupError('Username must be at least 3 characters');
  }
  if (!password || password.length < 8) {
    throw setupError('Password must be at least 8 characters');
  }

  const existing = await storage.getUserByUsername(name);
  if (existing) throw setupError('Username already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await storage.createUser({
    id: uuidv4(),
    username: name,
    password: hashedPassword,
    email: (email || '').trim(),
    role: 'admin'
  });

  const token = generateToken(newUser);

  return {
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  };
};

const saveSetupSettings = async (settings) => {
  assertSetupOpen();
  return deploymentSettingsService.saveSettings(settings);
};

const testDatabase = (provider, config) =>
  connectionTestService.testDatabase(provider, config || {});

const testStorage = (provider) =>
  connectionTestService.testFileStorage(provider);

const completeSetup = async ({ licenseSkipped, licenseKey, completedBy }) => {
  assertSetupOpen();

  if (!(await hasPrivilegedUser())) {
    throw setupError('Create an administrator account before finishing setup');
  }

  const key = (licenseKey || '').trim();
  const devBypass = process.env.MANTIS_DEV_DEFAULTS === 'true';

  if (!key && !devBypass && !licenseSkipped) {
    throw setupError(
      'A license key is required. Register free at the TurnerTech portal, then fetch or paste your Community license.'
    );
  }

  if (key) {
    const licenseService = require('./licenseService');
    const validation = await licenseService.validateLicense(key);
    if (!validation.valid) {
      throw setupError(`Invalid license key: ${validation.error}`);
    }

    if (storage.isSqlStorage()) {
      await licenseService.activateLicense(key, completedBy);
    } else {
      deploymentConfig.saveLocalConfig({ activatedLicenseKey: key });
      licenseService.invalidateCache();
    }
  }

  const partial = {
    setupComplete: true,
    setupCompletedAt: new Date().toISOString(),
    setupCompletedBy: completedBy || 'setup-wizard'
  };

  if (licenseSkipped && devBypass) partial.licenseSkipped = true;

  deploymentConfig.saveLocalConfig(partial);

  return { setupComplete: true, message: 'Setup complete' };
};

const getProviders = () => ({
  databaseProviders: deploymentConfig.DATABASE_PROVIDERS,
  fileStorageProviders: deploymentConfig.FILE_STORAGE_PROVIDERS,
  webhookEvents: deploymentConfig.WEBHOOK_EVENTS,
  documentation: '/docs/DEPLOYMENT.md'
});

module.exports = {
  isSetupComplete,
  getSetupStatus,
  bootstrapAdmin,
  saveSetupSettings,
  testDatabase,
  testStorage,
  completeSetup,
  getProviders,
  hasPrivilegedUser
};
