/**
 * Deployment configuration API — database, storage, webhooks, plugins.
 * Godmode only for writes; admins can view and test connections.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const deploymentConfig = require('../config/deployment.config');
const deploymentSettingsService = require('../services/deploymentSettingsService');
const connectionTestService = require('../services/connectionTestService');
const webhookService = require('../services/webhookService');

const isPrivileged = (user) => user && (user.role === 'godmode' || user.role === 'admin');
const isGodmode = (user) => user && user.role === 'godmode';

router.get('/setup-status', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const storage = require('../storage');
    const local = deploymentConfig.reloadLocalConfig();
    const licenseService = require('../services/licenseService');
    const license = await licenseService.getLicenseStatus();
    const dbType = storage.getStorageType();
    const dbConnected = dbType !== 'csv' && await storage.getStorage().isConnected().catch(() => false);

    const setupComplete = local.setupComplete === true;
    const databaseOk = dbConnected && dbType !== 'csv';
    const licenseOk = license.tier !== 'community' || license.licensee || local.licenseSkipped === true;

    // Existing MySQL/Postgres installs skip the wizard unless explicitly incomplete
    const needsSetup = !setupComplete && dbType === 'csv';
    res.json({
      needsSetup,
      setupComplete,
      steps: {
        database: { complete: databaseOk, provider: dbType, connected: dbConnected },
        storage: { complete: true, default: deploymentConfig.getFileStorageConfig().default },
        license: {
          complete: licenseOk,
          tier: license.tier,
          skipped: local.licenseSkipped === true
        }
      },
      isFirstRun: dbType === 'csv' && !setupComplete
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/setup/complete', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const partial = {
    setupComplete: true,
    setupCompletedAt: new Date().toISOString(),
    setupCompletedBy: req.user.username
  };

  if (req.body.licenseSkipped) partial.licenseSkipped = true;

  deploymentConfig.saveLocalConfig(partial);
  res.json({ message: 'Setup marked complete', setupComplete: true });
});

router.get('/providers', authMiddleware, (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    databaseProviders: deploymentConfig.DATABASE_PROVIDERS,
    fileStorageProviders: deploymentConfig.FILE_STORAGE_PROVIDERS,
    webhookEvents: deploymentConfig.WEBHOOK_EVENTS,
    documentation: '/docs/DEPLOYMENT.md'
  });
});

router.get('/status', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const storage = require('../storage');
    res.json({
      ...deploymentSettingsService.getSettingsForClient(),
      runtime: {
        databaseType: storage.getStorageType(),
        databaseConnected: await storage.getStorage().isConnected().catch(() => false)
      }
    });
  } catch (err) {
    res.json({
      ...deploymentSettingsService.getSettingsForClient(),
      runtime: { databaseType: 'unknown', databaseConnected: false, error: err.message }
    });
  }
});

router.post('/settings', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const result = await deploymentSettingsService.saveSettings(req.body);
    webhookService.reloadPlugins();
    res.json({
      ...result,
      restartRequired: !!req.body.database,
      message: req.body.database
        ? 'Database settings saved. Restart the server for database changes to take effect.'
        : 'Settings saved.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/test/database', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { provider, config } = req.body;
  const result = await connectionTestService.testDatabase(provider, config || {});
  res.json(result);
});

router.post('/test/storage', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const result = await connectionTestService.testFileStorage(req.body.provider);
  res.json(result);
});

router.post('/test/webhook', authMiddleware, async (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { url, secret } = req.body;
  const result = await connectionTestService.testWebhookUrl(url, secret);
  res.json(result);
});

router.get('/plugins', authMiddleware, (req, res) => {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const loaded = webhookService.loadPlugins().map(p => ({
    name: p.name,
    description: p.module.description || null
  }));

  res.json({
    loaded,
    pluginDir: deploymentConfig.getWebhookConfig().pluginDir,
    hint: 'Drop .js files in server/plugins/ exporting { name, description, onEvent(event, data) }'
  });
});

module.exports = router;
