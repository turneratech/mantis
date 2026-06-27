const TIERS = {
  COMMUNITY: 'community',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
  CLOUD: 'cloud'
};

const FEATURES = {
  BASIC_BUG_TRACKING: 'basic_bug_tracking',
  PROJECT_MANAGEMENT: 'project_management',
  GITHUB_INTEGRATION_BASIC: 'github_integration_basic',
  AI_INSIGHTS: 'ai_insights',
  AI_DUPLICATE_DETECTION: 'ai_duplicate_detection',
  ADVANCED_REPORTING: 'advanced_reporting',
  CUSTOM_FIELDS: 'custom_fields',
  CUSTOM_WORKFLOWS: 'custom_workflows',
  API_ACCESS: 'api_access',
  EMAIL_REPORTS: 'email_reports',
  PRIORITY_SUPPORT: 'priority_support',
  GITHUB_INTEGRATION_ADVANCED: 'github_integration_advanced',
  UNLIMITED_ATTACHMENTS: 'unlimited_attachments',
  EXPORT_DATA: 'export_data',
  SSO_SAML: 'sso_saml',
  AUDIT_LOGS: 'audit_logs',
  WHITE_LABELING: 'white_labeling',
  AI_ROOT_CAUSE_ANALYSIS: 'ai_root_cause_analysis',
  AI_PREDICTIVE_ALERTS: 'ai_predictive_alerts',
  ADVANCED_PERMISSIONS: 'advanced_permissions',
  SLA_MANAGEMENT: 'sla_management',
  CUSTOM_BRANDING: 'custom_branding',
  DEPLOYMENT_ASSISTANCE: 'deployment_assistance',
  MANAGED_HOSTING: 'managed_hosting',
  AUTO_UPDATES: 'auto_updates',
  DAILY_BACKUPS: 'daily_backups',
  UPTIME_SLA: 'uptime_sla'
};

const COMMUNITY_FEATURES = [
  FEATURES.BASIC_BUG_TRACKING,
  FEATURES.PROJECT_MANAGEMENT,
  FEATURES.GITHUB_INTEGRATION_BASIC
];

const PROFESSIONAL_FEATURES = [
  ...COMMUNITY_FEATURES,
  FEATURES.AI_INSIGHTS,
  FEATURES.AI_DUPLICATE_DETECTION,
  FEATURES.ADVANCED_REPORTING,
  FEATURES.CUSTOM_FIELDS,
  FEATURES.CUSTOM_WORKFLOWS,
  FEATURES.API_ACCESS,
  FEATURES.EMAIL_REPORTS,
  FEATURES.PRIORITY_SUPPORT,
  FEATURES.GITHUB_INTEGRATION_ADVANCED,
  FEATURES.UNLIMITED_ATTACHMENTS,
  FEATURES.EXPORT_DATA
];

const ENTERPRISE_FEATURES = [
  ...PROFESSIONAL_FEATURES,
  FEATURES.SSO_SAML,
  FEATURES.AUDIT_LOGS,
  FEATURES.WHITE_LABELING,
  FEATURES.AI_ROOT_CAUSE_ANALYSIS,
  FEATURES.AI_PREDICTIVE_ALERTS,
  FEATURES.ADVANCED_PERMISSIONS,
  FEATURES.SLA_MANAGEMENT,
  FEATURES.CUSTOM_BRANDING,
  FEATURES.DEPLOYMENT_ASSISTANCE
];

const CLOUD_FEATURES = [
  ...PROFESSIONAL_FEATURES,
  FEATURES.MANAGED_HOSTING,
  FEATURES.AUTO_UPDATES,
  FEATURES.DAILY_BACKUPS,
  FEATURES.UPTIME_SLA
];

const TIER_FEATURES = {
  [TIERS.COMMUNITY]: COMMUNITY_FEATURES,
  [TIERS.PROFESSIONAL]: PROFESSIONAL_FEATURES,
  [TIERS.ENTERPRISE]: ENTERPRISE_FEATURES,
  [TIERS.CLOUD]: CLOUD_FEATURES
};

const TIER_LIMITS = {
  [TIERS.COMMUNITY]: {
    maxUsers: 5,
    maxProjects: 3,
    maxBugs: 250,
    maxAttachmentSizeMB: 5,
    aiRequestsPerMonth: 0
  },
  [TIERS.PROFESSIONAL]: {
    maxUsers: null,
    maxProjects: null,
    maxBugs: null,
    maxAttachmentSizeMB: null,
    aiRequestsPerMonth: 1000
  },
  [TIERS.ENTERPRISE]: {
    maxUsers: null,
    maxProjects: null,
    maxBugs: null,
    maxAttachmentSizeMB: null,
    aiRequestsPerMonth: 5000
  },
  [TIERS.CLOUD]: {
    maxUsers: null,
    maxProjects: null,
    maxBugs: null,
    maxAttachmentSizeMB: null,
    aiRequestsPerMonth: 1000
  }
};

module.exports = { TIERS, FEATURES, TIER_FEATURES, TIER_LIMITS };
