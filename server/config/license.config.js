module.exports = {
  jwt: {
    algorithms: ['ES256'],
    issuer: 'turneratech.com'
  },
  gracePeriodDays: 14,
  cacheExpiryMs: 5 * 60 * 1000,
  onlineCheckIntervalHours: 24,
  validationUrl: process.env.LICENSE_VALIDATION_URL || 'https://license.turneratech.com/validate',
  enableOnlineValidation: process.env.ENABLE_ONLINE_VALIDATION === 'true',
  enableFeatureTracking: process.env.ENABLE_FEATURE_TRACKING !== 'false'
};
