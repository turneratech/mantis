const { TIERS, TIER_FEATURES, TIER_LIMITS } = require('../config/features');
const licenseConfig = require('../config/license.config');
const { verifyLicenseKey, isExpired, getExpirationDate } = require('../utils/jwtHelper');

let cachedStatus = null;
let cacheExpiry = 0;

const COMMUNITY_STATUS = Object.freeze({
  tier: TIERS.COMMUNITY,
  status: 'active',
  valid: true,
  features: TIER_FEATURES[TIERS.COMMUNITY],
  limits: TIER_LIMITS[TIERS.COMMUNITY],
  licensee: null,
  company: null,
  email: null,
  expiresAt: null,
  gracePeriodEnds: null,
  isTrial: false,
  isGracePeriod: false
});

const getCommunityStatus = () => ({ ...COMMUNITY_STATUS });

// Lazy-load db and storage to avoid circular init issues
const getStorage = () => require('../storage');

const getDb = () => {
  try {
    const type = getStorage().getStorageType();
    if (type === 'postgres') return require('../storage/postgres/db');
  } catch (_) {}
  return require('../storage/mysql/db');
};

const isDatabaseMode = () => {
  try {
    const t = getStorage().getStorageType();
    return t === 'mysql' || t === 'postgres';
  } catch (_) {
    return false;
  }
};

const buildStatusFromPayload = (payload) => {
  const tier = payload.tier || TIERS.COMMUNITY;
  const baseLimits = TIER_LIMITS[tier] || TIER_LIMITS[TIERS.COMMUNITY];
  const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;

  return {
    tier,
    originalTier: tier,
    status: payload.trial ? 'trial' : 'active',
    valid: true,
    isGracePeriod: false,
    isTrial: !!payload.trial,
    features: TIER_FEATURES[tier] || TIER_FEATURES[TIERS.COMMUNITY],
    limits: {
      maxUsers: payload.maxUsers !== undefined ? payload.maxUsers : baseLimits.maxUsers,
      maxProjects: payload.maxProjects !== undefined ? payload.maxProjects : baseLimits.maxProjects,
      maxBugs: payload.maxBugs !== undefined ? payload.maxBugs : baseLimits.maxBugs,
      maxAttachmentSizeMB: baseLimits.maxAttachmentSizeMB,
      aiRequestsPerMonth: baseLimits.aiRequestsPerMonth
    },
    licensee: payload.licensee || null,
    company: payload.company || null,
    email: payload.email || null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    gracePeriodEnds: null
  };
};

const buildStatus = (licenseRow) => {
  const now = new Date();
  const expiresAt = licenseRow.expires_at ? new Date(licenseRow.expires_at) : null;
  const gracePeriodEnds = licenseRow.grace_period_ends ? new Date(licenseRow.grace_period_ends) : null;

  let tier = licenseRow.tier;
  let status = licenseRow.status;
  let valid = true;
  let isGracePeriod = false;

  if (status === 'suspended') {
    tier = TIERS.COMMUNITY;
    valid = false;
  } else if (expiresAt && now > expiresAt) {
    if (gracePeriodEnds && now <= gracePeriodEnds) {
      isGracePeriod = true;
      status = 'expired';
      // Still valid during grace period — keep original tier
    } else {
      tier = TIERS.COMMUNITY;
      status = 'expired';
      valid = false;
    }
  }

  const effectiveTier = valid ? tier : TIERS.COMMUNITY;
  const baseLimits = TIER_LIMITS[effectiveTier];

  return {
    tier: effectiveTier,
    originalTier: licenseRow.tier,
    status,
    valid,
    isGracePeriod,
    isTrial: licenseRow.status === 'trial',
    features: TIER_FEATURES[effectiveTier],
    limits: {
      maxUsers: licenseRow.max_users !== undefined ? licenseRow.max_users : baseLimits.maxUsers,
      maxProjects: licenseRow.max_projects !== undefined ? licenseRow.max_projects : baseLimits.maxProjects,
      maxBugs: baseLimits.maxBugs,
      maxAttachmentSizeMB: baseLimits.maxAttachmentSizeMB,
      aiRequestsPerMonth: baseLimits.aiRequestsPerMonth
    },
    licensee: licenseRow.customer_name || null,
    company: licenseRow.company_name || null,
    email: licenseRow.customer_email || null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    gracePeriodEnds: gracePeriodEnds ? gracePeriodEnds.toISOString() : null
  };
};

const initialize = async () => {
  try {
    if (!isDatabaseMode()) {
      const deploymentConfig = require('../config/deployment.config');
      const local = deploymentConfig.reloadLocalConfig();
      if (local.activatedLicenseKey) {
        const validation = await validateLicense(local.activatedLicenseKey);
        if (validation.valid) {
          cachedStatus = buildStatusFromPayload(validation.payload);
          cacheExpiry = Date.now() + licenseConfig.cacheExpiryMs;
          console.log(`[License] CSV mode — tier from registered key: ${cachedStatus.tier.toUpperCase()}`);
          return;
        }
      }
      console.log('[License] CSV storage mode — Community Edition (register at portal for tracked license)');
      cachedStatus = getCommunityStatus();
      cacheExpiry = Date.now() + licenseConfig.cacheExpiryMs;
      return;
    }

    const { query, queryOne } = getDb();

    // Ensure licenses table exists before querying
    try {
      const license = await queryOne(
        `SELECT * FROM licenses WHERE status IN ('active', 'trial', 'expired') ORDER BY created_at DESC LIMIT 1`
      );

      if (!license) {
        await query(
          `INSERT INTO licenses (tier, status, max_users, max_projects) VALUES (?, ?, ?, ?)`,
          [TIERS.COMMUNITY, 'active', 5, 3]
        );
        cachedStatus = getCommunityStatus();
      } else {
        cachedStatus = buildStatus(license);
      }
    } catch (dbErr) {
      // Table may not exist yet — default to Community
      console.warn('[License] licenses table not found, defaulting to Community Edition');
      console.warn('[License] Run server/database/license_schema.sql to enable license management');
      cachedStatus = getCommunityStatus();
    }

    cacheExpiry = Date.now() + licenseConfig.cacheExpiryMs;
    console.log(`[License] Tier: ${cachedStatus.tier.toUpperCase()} | Status: ${cachedStatus.status}`);
  } catch (error) {
    console.warn('[License] Init error, defaulting to Community Edition:', error.message);
    cachedStatus = getCommunityStatus();
    cacheExpiry = Date.now() + licenseConfig.cacheExpiryMs;
  }
};

const getLicenseStatus = async () => {
  if (cachedStatus && Date.now() < cacheExpiry) {
    return cachedStatus;
  }

  try {
    if (!isDatabaseMode()) {
      const deploymentConfig = require('../config/deployment.config');
      const local = deploymentConfig.reloadLocalConfig();
      if (local.activatedLicenseKey) {
        const validation = await validateLicense(local.activatedLicenseKey);
        if (validation.valid) {
          cachedStatus = buildStatusFromPayload(validation.payload);
          cacheExpiry = Date.now() + licenseConfig.cacheExpiryMs;
          return cachedStatus;
        }
      }
      return getCommunityStatus();
    }

    const { query, queryOne } = getDb();

    const license = await queryOne(
      `SELECT * FROM licenses WHERE status IN ('active', 'trial', 'expired') ORDER BY created_at DESC LIMIT 1`
    );

    if (!license) {
      cachedStatus = getCommunityStatus();
    } else {
      cachedStatus = buildStatus(license);
      await query(`UPDATE licenses SET last_validated_at = NOW() WHERE id = ?`, [license.id]);
    }

    cacheExpiry = Date.now() + licenseConfig.cacheExpiryMs;
    return cachedStatus;
  } catch (error) {
    console.warn('[License] Status fetch failed, using cached:', error.message);
    return cachedStatus || getCommunityStatus();
  }
};

const validateLicense = async (licenseKey) => {
  try {
    const payload = verifyLicenseKey(licenseKey);
    if (isExpired(payload)) {
      return { valid: false, error: 'License key is expired', payload };
    }
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

const activateLicense = async (licenseKey, adminEmail) => {
  if (!isDatabaseMode()) {
    throw new Error('License activation requires MySQL or PostgreSQL storage');
  }

  const validation = await validateLicense(licenseKey);
  if (!validation.valid) {
    throw new Error(`Invalid license key: ${validation.error}`);
  }

  const payload = validation.payload;
  const expiresAt = getExpirationDate(payload);
  const gracePeriodEnds = expiresAt
    ? new Date(expiresAt.getTime() + licenseConfig.gracePeriodDays * 24 * 60 * 60 * 1000)
    : null;

  const toMysqlTimestamp = (d) => d ? d.toISOString().slice(0, 19).replace('T', ' ') : null;

  const { query } = getDb();

  await query(`UPDATE licenses SET status = 'suspended' WHERE status IN ('active', 'trial')`);

  await query(
    `INSERT INTO licenses
     (license_key, tier, status, customer_email, customer_name, company_name,
      max_users, max_projects, expires_at, grace_period_ends, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      licenseKey,
      payload.tier || TIERS.PROFESSIONAL,
      payload.trial ? 'trial' : 'active',
      payload.email || adminEmail || null,
      payload.licensee || null,
      payload.company || null,
      payload.maxUsers || null,
      payload.maxProjects || null,
      toMysqlTimestamp(expiresAt),
      toMysqlTimestamp(gracePeriodEnds),
      JSON.stringify({ jti: payload.jti, features: payload.features || [] })
    ]
  );

  cachedStatus = null;
  cacheExpiry = 0;

  return getLicenseStatus();
};

const deactivateLicense = async () => {
  if (!isDatabaseMode()) {
    throw new Error('License management requires MySQL or PostgreSQL storage');
  }

  const { query } = getDb();
  await query(`UPDATE licenses SET status = 'suspended' WHERE status IN ('active', 'trial')`);
  await query(
    `INSERT INTO licenses (tier, status, max_users, max_projects) VALUES (?, ?, ?, ?)`,
    [TIERS.COMMUNITY, 'active', 5, 3]
  );

  cachedStatus = null;
  cacheExpiry = 0;

  return getLicenseStatus();
};

const countUsers = async () => {
  if (isDatabaseMode()) {
    const rows = await getDb().query(`SELECT COUNT(*) AS count FROM users`);
    return Number(rows[0].count);
  }
  const users = await getStorage().getAllUsers();
  return users.length;
};

const countProjects = async () => {
  if (isDatabaseMode()) {
    const rows = await getDb().query(`SELECT COUNT(*) AS count FROM projects`);
    return Number(rows[0].count);
  }
  const projects = await getStorage().getAllProjects(null, true);
  return projects.length;
};

const countBugs = async () => {
  if (isDatabaseMode()) {
    const rows = await getDb().query(`SELECT COUNT(*) AS count FROM bugs`);
    return Number(rows[0].count);
  }
  const bugs = await getStorage().getAllBugs(100000);
  return bugs.length;
};

const checkLimit = async (type) => {
  const status = await getLicenseStatus();
  const limits = status.limits;

  if (type === 'users') {
    if (limits.maxUsers === null) return { allowed: true, current: null, max: null };
    const count = await countUsers();
    return { allowed: count < limits.maxUsers, current: count, max: limits.maxUsers };
  }

  if (type === 'projects') {
    if (limits.maxProjects === null) return { allowed: true, current: null, max: null };
    const count = await countProjects();
    return { allowed: count < limits.maxProjects, current: count, max: limits.maxProjects };
  }

  if (type === 'bugs') {
    if (limits.maxBugs === null) return { allowed: true, current: null, max: null };
    const count = await countBugs();
    return { allowed: count < limits.maxBugs, current: count, max: limits.maxBugs };
  }

  return { allowed: true, current: null, max: null };
};

const getAttachmentLimitBytes = async () => {
  const status = await getLicenseStatus();
  const maxMB = status.limits.maxAttachmentSizeMB;
  if (maxMB === null || maxMB === undefined) return null;
  return maxMB * 1024 * 1024;
};

const invalidateCache = () => {
  cachedStatus = null;
  cacheExpiry = 0;
};

module.exports = {
  initialize,
  validateLicense,
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  checkLimit,
  getAttachmentLimitBytes,
  invalidateCache
};
