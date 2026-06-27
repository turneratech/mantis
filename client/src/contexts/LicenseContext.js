import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const LicenseContext = createContext(null);

const COMMUNITY_FEATURES = ['basic_bug_tracking', 'project_management', 'github_integration_basic'];

const DEFAULT_LIMITS = {
  maxUsers: 5,
  maxProjects: 3,
  maxBugs: 250,
  maxAttachmentSizeMB: 5,
  aiRequestsPerMonth: 0
};

const DEFAULT_USAGE = {
  users: { allowed: true, current: null, max: null },
  projects: { allowed: true, current: null, max: null },
  bugs: { allowed: true, current: null, max: null }
};

const DEFAULT_STATE = {
  tier: 'community',
  status: 'active',
  valid: true,
  features: COMMUNITY_FEATURES,
  limits: DEFAULT_LIMITS,
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
  const [usage, setUsage] = useState(DEFAULT_USAGE);
  const [upgradePrompt, setUpgradePrompt] = useState({ open: false, feature: null });
  const intervalRef = useRef(null);

  const fetchLicenseStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/license/status');
      setLicense(prev => ({ ...prev, ...res.data, loading: false, error: null }));
    } catch (err) {
      setLicense(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  const fetchLicenseLimits = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/license/limits');
      setUsage(res.data);
    } catch (_) {
      // Unauthenticated or unavailable — keep prior usage
    }
  }, []);

  const refreshLicense = useCallback(async () => {
    await Promise.all([fetchLicenseStatus(), fetchLicenseLimits()]);
  }, [fetchLicenseStatus, fetchLicenseLimits]);

  useEffect(() => {
    refreshLicense();
    intervalRef.current = setInterval(refreshLicense, 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [refreshLicense]);

  const hasFeature = useCallback((featureName) => {
    if (license.featureMap && featureName in license.featureMap) {
      return license.featureMap[featureName];
    }
    return Array.isArray(license.features) && license.features.includes(featureName);
  }, [license]);

  const getLimitInfo = useCallback((limitType) => {
    const item = usage[limitType];
    if (item && item.max !== null && item.max !== undefined) {
      return { current: item.current, max: item.max, allowed: item.allowed };
    }
    const keyMap = { users: 'maxUsers', projects: 'maxProjects', bugs: 'maxBugs' };
    const max = license.limits?.[keyMap[limitType]] ?? null;
    return { current: item?.current ?? null, max, allowed: item?.allowed ?? true };
  }, [usage, license]);

  const isAtLimit = useCallback((limitType) => {
    const info = getLimitInfo(limitType);
    if (info.max === null || info.max === undefined) return false;
    return !info.allowed || (info.current !== null && info.current >= info.max);
  }, [getLimitInfo]);

  const checkLimit = useCallback((limitType) => getLimitInfo(limitType), [getLimitInfo]);

  const activateLicense = useCallback(async (licenseKey) => {
    const res = await axios.post('/api/license/activate', { licenseKey });
    await refreshLicense();
    return res.data;
  }, [refreshLicense]);

  const promptUpgrade = useCallback((featureName) => {
    setUpgradePrompt({ open: true, feature: featureName });
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setUpgradePrompt({ open: false, feature: null });
  }, []);

  return (
    <LicenseContext.Provider value={{
      license,
      usage,
      hasFeature,
      checkLimit,
      getLimitInfo,
      isAtLimit,
      activateLicense,
      promptUpgrade,
      closeUpgradePrompt,
      upgradePrompt,
      refreshLicense
    }}>
      {children}
    </LicenseContext.Provider>
  );
}
