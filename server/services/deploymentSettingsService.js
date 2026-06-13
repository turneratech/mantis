/**
 * Persist deployment settings (webhooks, non-secret overrides) to MySQL or local JSON.
 */

const deploymentConfig = require('../config/deployment.config');

const maskSecret = (val) => (val ? '••••••••' : '');

const getSettingsForClient = () => {
  const summary = deploymentConfig.getDeploymentSummary();
  const local = deploymentConfig.reloadLocalConfig();

  return {
    ...summary,
    settings: {
      database: {
        provider: local.database?.provider || summary.database.provider,
        mysql: {
          host: local.database?.mysql?.host || summary.database.mysql.host,
          port: local.database?.mysql?.port || summary.database.mysql.port,
          user: local.database?.mysql?.user || summary.database.mysql.user,
          database: local.database?.mysql?.database || summary.database.mysql.database,
          ssl: local.database?.mysql?.ssl || false,
          password: maskSecret(local.database?.mysql?.password)
        },
        postgres: {
          connectionString: local.database?.postgres?.connectionString ? '••••••••' : ''
        },
        supabase: {
          url: local.database?.supabase?.url || summary.database.supabase.url || '',
          serviceRoleKey: maskSecret(local.database?.supabase?.serviceRoleKey),
          databaseUrl: local.database?.supabase?.databaseUrl ? '••••••••' : ''
        }
      },
      storage: {
        default: local.storage?.default || summary.storage.default,
        s3: local.storage?.s3 ? { ...local.storage.s3, secretAccessKey: maskSecret(local.storage.s3.secretAccessKey) } : null,
        azure: local.storage?.azure ? { ...local.storage.azure, accountKey: maskSecret(local.storage.azure.accountKey) } : null,
        sharepoint: local.storage?.sharepoint ? { ...local.storage.sharepoint, clientSecret: maskSecret(local.storage.sharepoint.clientSecret) } : null,
        supabase: local.storage?.supabase ? { ...local.storage.supabase, serviceRoleKey: maskSecret(local.storage.supabase.serviceRoleKey) } : null
      },
      webhooks: (local.webhooks || []).map(w => ({
        ...w,
        secret: maskSecret(w.secret)
      }))
    }
  };
};

const saveSettings = async (body) => {
  const partial = {};

  if (body.database) {
    partial.database = { ...body.database };
    if (partial.database.mysql?.password === '••••••••') {
      delete partial.database.mysql.password;
    }
    if (partial.database.supabase?.serviceRoleKey === '••••••••') {
      delete partial.database.supabase.serviceRoleKey;
    }
    if (partial.database.postgres?.connectionString === '••••••••') {
      delete partial.database.postgres.connectionString;
    }
  }

  if (body.storage) {
    partial.storage = { ...body.storage };
    if (partial.storage.s3?.secretAccessKey === '••••••••') delete partial.storage.s3.secretAccessKey;
    if (partial.storage.azure?.accountKey === '••••••••') delete partial.storage.azure.accountKey;
    if (partial.storage.sharepoint?.clientSecret === '••••••••') delete partial.storage.sharepoint.clientSecret;
    if (partial.storage.supabase?.serviceRoleKey === '••••••••') delete partial.storage.supabase.serviceRoleKey;
  }

  if (body.webhooks) {
    partial.webhooks = body.webhooks.map(w => {
      const copy = { ...w };
      if (copy.secret === '••••••••') delete copy.secret;
      if (!copy.id) copy.id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return copy;
    });
  }

  const saved = deploymentConfig.saveLocalConfig(partial);

  try {
    const storage = require('../storage');
    if (storage.getStorageType() === 'mysql') {
      const { query } = require('../storage/mysql/db');
      await query(
        `INSERT INTO deployment_settings (setting_key, setting_value, updated_at)
         VALUES ('deployment', ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
        [JSON.stringify(saved)]
      ).catch(() => {});
    }
  } catch {
    // table may not exist yet
  }

  return getSettingsForClient();
};

module.exports = {
  getSettingsForClient,
  saveSettings
};
