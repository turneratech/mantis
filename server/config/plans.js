/**
 * Canonical tier catalog — limits, features, and display metadata.
 * Import tier matrices from features.js; use this module for pricing/portal UI.
 */
const { TIERS, FEATURES, TIER_FEATURES, TIER_LIMITS } = require('./features');

const PLANS = {
  [TIERS.COMMUNITY]: {
    id: TIERS.COMMUNITY,
    name: 'Community',
    displayName: 'Community Edition',
    deployment: 'self-hosted',
    billing: { type: 'free', label: '$0/forever' },
    limits: TIER_LIMITS[TIERS.COMMUNITY],
    features: TIER_FEATURES[TIERS.COMMUNITY],
    highlights: [
      '5 users · 3 projects · 250 bugs',
      'Core bug tracking',
      'GitHub integration',
      '5 MB attachments',
      'Self-hosted CSV or DB'
    ],
    issuable: true,
    contactSales: false
  },
  [TIERS.PROFESSIONAL]: {
    id: TIERS.PROFESSIONAL,
    name: 'Professional',
    displayName: 'Professional',
    deployment: 'self-hosted',
    billing: { type: 'subscription', label: '$49–99/mo', annualLabel: '$499–799/yr' },
    limits: TIER_LIMITS[TIERS.PROFESSIONAL],
    features: TIER_FEATURES[TIERS.PROFESSIONAL],
    highlights: [
      'Unlimited users, projects & bugs',
      'AI insights & advanced reports',
      'Email scheduled reports',
      'Unlimited attachments',
      'Priority support'
    ],
    issuable: true,
    contactSales: false
  },
  [TIERS.ENTERPRISE]: {
    id: TIERS.ENTERPRISE,
    name: 'Enterprise',
    displayName: 'Enterprise',
    deployment: 'self-hosted',
    billing: { type: 'custom', label: 'Custom annual' },
    limits: TIER_LIMITS[TIERS.ENTERPRISE],
    features: TIER_FEATURES[TIERS.ENTERPRISE],
    highlights: [
      'SSO / SAML',
      'Audit logs & SLA management',
      'White-label options',
      'Advanced AI analytics',
      'Dedicated support'
    ],
    issuable: false,
    contactSales: true,
    contactEmail: 'sales@turneratech.com'
  },
  [TIERS.CLOUD]: {
    id: TIERS.CLOUD,
    name: 'Cloud',
    displayName: 'Managed Cloud',
    deployment: 'managed',
    billing: { type: 'per-seat', label: '$15–25/user/mo' },
    limits: TIER_LIMITS[TIERS.CLOUD],
    features: TIER_FEATURES[TIERS.CLOUD],
    highlights: [
      'All Professional features',
      'Managed hosting & auto-updates',
      'Daily backups',
      'Uptime SLA'
    ],
    issuable: false,
    contactSales: true,
    contactEmail: 'sales@turneratech.com'
  }
};

const getPlan = (tierId) => PLANS[tierId] || PLANS[TIERS.COMMUNITY];

const getAllPlans = () => Object.values(PLANS);

const getIssuablePlans = () => getAllPlans().filter(p => p.issuable);

module.exports = {
  TIERS,
  FEATURES,
  TIER_FEATURES,
  TIER_LIMITS,
  PLANS,
  getPlan,
  getAllPlans,
  getIssuablePlans
};
