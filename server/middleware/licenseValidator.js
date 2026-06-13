const licenseService = require('../services/licenseService');
const featureService = require('../services/featureService');
const { TIER_FEATURES, TIERS } = require('../config/features');

// Attaches req.license to every request — lightweight, uses cached status
const attachLicenseInfo = async (req, res, next) => {
  try {
    req.license = await licenseService.getLicenseStatus();
  } catch (_) {
    req.license = {
      tier: TIERS.COMMUNITY,
      status: 'active',
      valid: true,
      features: TIER_FEATURES[TIERS.COMMUNITY],
      limits: require('../config/features').TIER_LIMITS[TIERS.COMMUNITY]
    };
  }
  next();
};

// Middleware factory: gate a route behind a specific feature flag
const requireFeature = (featureName) => async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    await featureService.requireFeature(featureName, userId);
    next();
  } catch (error) {
    if (error.code === 'FEATURE_NOT_AVAILABLE') {
      return res.status(403).json({
        error: 'Feature not available on your current license tier',
        feature: error.feature,
        currentTier: error.currentTier,
        upgradeRequired: true
      });
    }
    next(error);
  }
};

// Middleware factory: enforce a user/project count limit before creating a resource
const checkLimit = (limitType) => async (req, res, next) => {
  try {
    const result = await licenseService.checkLimit(limitType);
    if (!result.allowed) {
      return res.status(403).json({
        error: `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} limit reached for your license tier`,
        limitType,
        current: result.current,
        max: result.max,
        upgradeRequired: true
      });
    }
    next();
  } catch (error) {
    // Fail open — a broken limit check must never block core functionality
    console.warn(`[License] Limit check error for '${limitType}':`, error.message);
    next();
  }
};

module.exports = { attachLicenseInfo, requireFeature, checkLimit };
