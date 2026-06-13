const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const licenseService = require('../services/licenseService');
const featureService = require('../services/featureService');

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'godmode')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/license/status — Public: returns current tier, features, limits
router.get('/status', async (req, res) => {
  try {
    const status = await licenseService.getLicenseStatus();
    const featureMap = await featureService.getFeatureAvailabilityMap();
    res.json({ ...status, featureMap });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve license status' });
  }
});

// POST /api/license/activate — Admin: activate a new license key
router.post('/activate', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey || typeof licenseKey !== 'string') {
      return res.status(400).json({ error: 'licenseKey is required' });
    }
    const status = await licenseService.activateLicense(licenseKey, req.user.email || req.user.username);
    featureService.clearCache();
    res.json({ message: 'License activated successfully', ...status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/license/validate — Admin: decode and validate a key without activating
router.post('/validate', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey || typeof licenseKey !== 'string') {
      return res.status(400).json({ error: 'licenseKey is required' });
    }
    const result = await licenseService.validateLicense(licenseKey);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/license/limits — Auth: current resource counts vs tier limits
router.get('/limits', authMiddleware, async (req, res) => {
  try {
    const [users, projects] = await Promise.all([
      licenseService.checkLimit('users'),
      licenseService.checkLimit('projects')
    ]);
    res.json({ users, projects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve limit information' });
  }
});

// DELETE /api/license/deactivate — Admin: suspend active license, revert to Community
router.delete('/deactivate', authMiddleware, isAdmin, async (req, res) => {
  try {
    const status = await licenseService.deactivateLicense();
    featureService.clearCache();
    res.json({ message: 'License deactivated — reverted to Community Edition', ...status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
