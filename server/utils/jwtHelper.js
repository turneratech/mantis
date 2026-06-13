const jwt = require('jsonwebtoken');
const licenseConfig = require('../config/license.config');

const verifyLicenseKey = (licenseKey) => {
  const publicKey = process.env.LICENSE_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('LICENSE_PUBLIC_KEY environment variable is not configured');
  }
  return jwt.verify(licenseKey, publicKey, {
    algorithms: licenseConfig.jwt.algorithms,
    issuer: licenseConfig.jwt.issuer
  });
};

const decodeLicenseKey = (licenseKey) => {
  return jwt.decode(licenseKey);
};

const isExpired = (payload) => {
  if (!payload || !payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
};

const getExpirationDate = (payload) => {
  if (!payload || !payload.exp) return null;
  return new Date(payload.exp * 1000);
};

module.exports = { verifyLicenseKey, decodeLicenseKey, isExpired, getExpirationDate };
