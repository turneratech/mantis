const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPlan } = require('./plansBridge');

const ISSUER = 'turneratech.com';

const TIER_EXPIRY = {
  community: '10y',
  professional: '365d',
  enterprise: '365d',
  cloud: '365d',
  trial: '14d'
};

const issueLicense = (privateKey, { tier, account, instanceId, trial = false }) => {
  const effectiveTier = trial ? 'professional' : tier;
  const plan = getPlan(effectiveTier);
  const limits = plan.limits || {};
  const features = plan.features || [];
  const expiresIn = trial ? TIER_EXPIRY.trial : (TIER_EXPIRY[tier] || TIER_EXPIRY.community);

  const payload = {
    tier: effectiveTier,
    licensee: account.name || account.email,
    email: account.email,
    company: account.company || null,
    maxUsers: limits.maxUsers ?? null,
    maxProjects: limits.maxProjects ?? null,
    maxBugs: limits.maxBugs ?? null,
    features,
    trial: !!trial,
    iss: ISSUER,
    jti: uuidv4(),
    instanceId: instanceId || null
  };

  const licenseKey = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    expiresIn
  });

  return { licenseKey, payload, expiresIn, features, limits };
};

module.exports = { issueLicense, ISSUER, TIER_EXPIRY };
