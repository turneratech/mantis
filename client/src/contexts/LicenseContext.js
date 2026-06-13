import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const LicenseContext = createContext(null);

const COMMUNITY_FEATURES = ['basic_bug_tracking', 'project_management', 'github_integration_basic'];

const DEFAULT_STATE = {
  tier: 'community',
  status: 'active',
  valid: true,
  features: COMMUNITY_FEATURES,
  limits: { maxUsers: 5, maxProjects: 3, maxAttachmentSizeMB: 5, aiRequestsPerMonth: 0 },
  featureMap: {},
  licensee: null,
  company: null,
  expiresAt: null,
  isTrial: false,
  isGracePeriod: false,
  loading: true,
  error: null
};

export function LicenseProvider({ children }) {
  const [license, setLicense] = useState(DEFAULT_STATE);
  const [upgradePrompt, setUpgradePrompt] = useState({ open: false, feature: null });
  const intervalRef = useRef(null);

  const fetchLicenseStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/license/status');
      setLicense(prev => ({ ...prev, ...res.data, loading: false, error: null }));
    } catch (err) {
      // Non-fatal — keep current state, just clear loading
      setLicense(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    fetchLicenseStatus();
    intervalRef.current = setInterval(fetchLicenseStatus, 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [fetchLicenseStatus]);

  const hasFeature = useCallback((featureName) => {
    if (license.featureMap && featureName in license.featureMap) {
      return license.featureMap[featureName];
    }
    return Array.isArray(license.features) && license.features.includes(featureName);
  }, [license]);

  const checkLimit = useCallback((limitType) => {
    const limits = license.limits || {};
    const key = `max${limitType.charAt(0).toUpperCase()}${limitType.slice(1)}`;
    return { max: limits[key] ?? null };
  }, [license]);

  const activateLicense = useCallback(async (licenseKey) => {
    const res = await axios.post('/api/license/activate', { licenseKey });
    await fetchLicenseStatus();
    return res.data;
  }, [fetchLicenseStatus]);

  const promptUpgrade = useCallback((featureName) => {
    setUpgradePrompt({ open: true, feature: featureName });
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setUpgradePrompt({ open: false, feature: null });
  }, []);

  return (
    <LicenseContext.Provider value={{
      license,
      hasFeature,
      checkLimit,
      activateLicense,
      promptUpgrade,
      closeUpgradePrompt,
      upgradePrompt,
      refreshLicense: fetchLicenseStatus
    }}>
      {children}
    </LicenseContext.Provider>
  );
}
