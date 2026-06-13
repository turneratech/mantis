import React from 'react';
import { useLicense } from '../../hooks/useLicense';

const FEATURE_TIER = {
  ai_insights: 'Professional',
  ai_duplicate_detection: 'Professional',
  advanced_reporting: 'Professional',
  custom_fields: 'Professional',
  custom_workflows: 'Professional',
  api_access: 'Professional',
  email_reports: 'Professional',
  priority_support: 'Professional',
  github_integration_advanced: 'Professional',
  unlimited_attachments: 'Professional',
  export_data: 'Professional',
  sso_saml: 'Enterprise',
  audit_logs: 'Enterprise',
  white_labeling: 'Enterprise',
  ai_root_cause_analysis: 'Enterprise',
  ai_predictive_alerts: 'Enterprise',
  advanced_permissions: 'Enterprise',
  sla_management: 'Enterprise',
  custom_branding: 'Enterprise',
  deployment_assistance: 'Enterprise',
  managed_hosting: 'Cloud',
  auto_updates: 'Cloud',
  daily_backups: 'Cloud',
  uptime_sla: 'Cloud'
};

const FEATURE_LABEL = {
  ai_insights: 'AI Insights',
  ai_duplicate_detection: 'AI Duplicate Detection',
  advanced_reporting: 'Advanced Reporting',
  custom_fields: 'Custom Fields',
  custom_workflows: 'Custom Workflows',
  api_access: 'API Access',
  email_reports: 'Email Reports',
  priority_support: 'Priority Support',
  github_integration_advanced: 'Advanced GitHub Integration',
  unlimited_attachments: 'Unlimited Attachments',
  export_data: 'Data Export',
  sso_saml: 'SSO / SAML',
  audit_logs: 'Audit Logs',
  white_labeling: 'White Labeling',
  ai_root_cause_analysis: 'AI Root Cause Analysis',
  ai_predictive_alerts: 'AI Predictive Alerts',
  advanced_permissions: 'Advanced Permissions',
  sla_management: 'SLA Management',
  custom_branding: 'Custom Branding',
  deployment_assistance: 'Deployment Assistance',
  managed_hosting: 'Managed Hosting',
  auto_updates: 'Auto Updates',
  daily_backups: 'Daily Backups',
  uptime_sla: 'Uptime SLA'
};

const TIER_PRICE = {
  Professional: '$49–99/mo',
  Enterprise: '$199–299/mo',
  Cloud: '$15–25/user/mo'
};

export function UpgradePrompt() {
  const { upgradePrompt, closeUpgradePrompt, license } = useLicense();

  if (!upgradePrompt.open) return null;

  const feature = upgradePrompt.feature;
  const requiredTier = FEATURE_TIER[feature] || 'Professional';
  const featureLabel = FEATURE_LABEL[feature] || feature;
  const currentTier = license.tier ? license.tier.charAt(0).toUpperCase() + license.tier.slice(1) : 'Community';

  const tierOrder = ['Community', 'Professional', 'Enterprise', 'Cloud'];
  const requiredIdx = tierOrder.indexOf(requiredTier);
  const upgradeTiers = tierOrder.slice(requiredIdx);

  return (
    <div style={s.overlay} onClick={closeUpgradePrompt}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={s.lockCircle}>🔒</div>
          <div>
            <h2 style={s.title}>Upgrade Required</h2>
            <p style={s.subtitle}>This feature requires a higher plan</p>
          </div>
        </div>

        <div style={s.body}>
          <div style={s.featurePill}>{featureLabel}</div>
          <p style={s.description}>
            You are on the <strong>{currentTier}</strong> plan.{' '}
            <strong>{featureLabel}</strong> is available starting from the{' '}
            <span style={s.highlight}>{requiredTier}</span> plan.
          </p>

          <div style={s.tierGrid}>
            {upgradeTiers.map(tier => (
              <div key={tier} style={s.tierCard}>
                <div style={s.tierName}>{tier}</div>
                <div style={s.tierPrice}>{TIER_PRICE[tier] || 'Contact us'}</div>
              </div>
            ))}
          </div>

          <p style={s.contactLine}>
            Contact{' '}
            <a href="mailto:sales@turneratech.com" style={s.link}>sales@turneratech.com</a>{' '}
            to upgrade your license.
          </p>
        </div>

        <div style={s.footer}>
          <button style={s.closeBtn} onClick={closeUpgradePrompt}>Close</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 10000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  modal: {
    background: '#fff', borderRadius: '10px',
    width: '440px', maxWidth: '95vw',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
    overflow: 'hidden'
  },
  header: {
    background: '#1a1a2e', color: '#fff',
    padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: '16px'
  },
  lockCircle: {
    fontSize: '32px', lineHeight: 1
  },
  title: { margin: 0, fontSize: '18px', fontWeight: 700 },
  subtitle: { margin: '2px 0 0', fontSize: '13px', opacity: 0.7 },
  body: { padding: '20px 24px' },
  featurePill: {
    display: 'inline-block',
    background: '#fff3e0', color: '#e67e22',
    border: '1px solid #e67e22',
    padding: '3px 12px', borderRadius: '20px',
    fontSize: '13px', fontWeight: 600,
    marginBottom: '12px'
  },
  description: { color: '#444', lineHeight: 1.6, marginBottom: '16px', fontSize: '14px' },
  highlight: {
    background: '#e67e22', color: '#fff',
    padding: '1px 7px', borderRadius: '3px', fontSize: '13px'
  },
  tierGrid: { display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' },
  tierCard: {
    flex: '1 1 120px',
    border: '1px solid #e0e0e0', borderRadius: '6px',
    padding: '12px', textAlign: 'center'
  },
  tierName: { fontWeight: 600, color: '#1a1a2e', fontSize: '14px', marginBottom: '4px' },
  tierPrice: { color: '#e67e22', fontSize: '13px' },
  contactLine: { fontSize: '13px', color: '#666', textAlign: 'center', margin: 0 },
  link: { color: '#e67e22', textDecoration: 'none', fontWeight: 500 },
  footer: {
    padding: '14px 24px', borderTop: '1px solid #f0f0f0',
    display: 'flex', justifyContent: 'flex-end'
  },
  closeBtn: {
    background: '#1a1a2e', color: '#fff',
    border: 'none', padding: '8px 22px',
    borderRadius: '5px', cursor: 'pointer', fontSize: '14px'
  }
};
