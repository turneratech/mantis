const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const mapAccount = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name || '',
    company: row.company || '',
    createdAt: row.created_at
  };
};

const mapLicense = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    email: row.email,
    tier: row.tier,
    status: row.status,
    licenseKey: row.license_key,
    instanceId: row.instance_id,
    trial: row.is_trial,
    features: row.features || [],
    limits: row.limits || {},
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
};

const findAccountByEmail = async (email) => {
  const row = await db.queryOne(
    `SELECT * FROM portal_accounts WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  return mapAccount(row);
};

const findAccountById = async (id) => {
  const row = await db.queryOne(`SELECT * FROM portal_accounts WHERE id = $1`, [id]);
  return mapAccount(row);
};

const createAccount = async ({ email, passwordHash, name, company }) => {
  const row = await db.queryOne(
    `INSERT INTO portal_accounts (email, password_hash, name, company)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email.trim().toLowerCase(), passwordHash, (name || '').trim(), (company || '').trim()]
  );
  return mapAccount(row);
};

const recordLicense = async ({
  accountId,
  email,
  tier,
  licenseKey,
  instanceId,
  trial,
  features,
  limits,
  expiresAt
}) => {
  const effectiveStatus = trial ? 'trial' : 'active';
  const row = await db.queryOne(
    `INSERT INTO portal_licenses
       (account_id, email, tier, status, license_key, instance_id, is_trial, features, limits, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      accountId,
      email,
      tier,
      effectiveStatus,
      licenseKey,
      instanceId || null,
      !!trial,
      JSON.stringify(features || []),
      JSON.stringify(limits || {}),
      expiresAt || null
    ]
  );

  await db.query(
    `INSERT INTO portal_license_events (account_id, license_id, event_type, metadata)
     VALUES ($1, $2, 'issued', $3)`,
    [accountId, row.id, JSON.stringify({ tier, trial: !!trial, instanceId: instanceId || null })]
  );

  return mapLicense(row);
};

const recordPurchaseToken = async (token, licenseId) => {
  await db.query(
    `INSERT INTO portal_purchase_tokens (token, license_id) VALUES ($1, $2)`,
    [token, licenseId]
  );
};

const findLatestLicense = async (accountId, instanceId) => {
  let row;
  if (instanceId) {
    row = await db.queryOne(
      `SELECT * FROM portal_licenses
       WHERE account_id = $1 AND (instance_id IS NULL OR instance_id = $2)
       ORDER BY created_at DESC LIMIT 1`,
      [accountId, instanceId]
    );
  } else {
    row = await db.queryOne(
      `SELECT * FROM portal_licenses WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [accountId]
    );
  }
  return mapLicense(row);
};

const findLicenseById = async (id) => {
  const row = await db.queryOne(`SELECT * FROM portal_licenses WHERE id = $1`, [id]);
  return mapLicense(row);
};

const listLicensesByAccount = async (accountId, includeKeys = false) => {
  const rows = await db.query(
    `SELECT * FROM portal_licenses WHERE account_id = $1 ORDER BY created_at DESC`,
    [accountId]
  );
  return rows.map(row => {
    const lic = mapLicense(row);
    if (!includeKeys) delete lic.licenseKey;
    return lic;
  });
};

module.exports = {
  findAccountByEmail,
  findAccountById,
  createAccount,
  recordLicense,
  recordPurchaseToken,
  findLatestLicense,
  findLicenseById,
  listLicensesByAccount
};
