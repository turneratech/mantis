import React from 'react';
import { useLicense } from '../../hooks/useLicense';

const TIER_STYLE = {
  community:    { background: '#f0f0f0', color: '#666' },
  professional: { background: '#e3f2fd', color: '#1565c0' },
  enterprise:   { background: '#f3e5f5', color: '#6a1b9a' },
  cloud:        { background: '#e8f5e9', color: '#2e7d32' }
};

/**
 * Small inline badge showing the current license tier.
 * Renders nothing while the license is still loading.
 */
export function LicenseStatus() {
  const { license } = useLicense();
  if (license.loading) return null;

  const tier = license.tier || 'community';
  const style = TIER_STYLE[tier] || TIER_STYLE.community;

  return (
    <span style={{
      ...style,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      whiteSpace: 'nowrap'
    }}>
      {tier}
      {license.isTrial && ' · Trial'}
      {license.isGracePeriod && ' · Grace Period'}
    </span>
  );
}
