/**
 * Unified portal data store — Supabase/Postgres when PORTAL_DATABASE_URL is set,
 * otherwise local JSON file (dev fallback).
 */
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const jsonStore = require('./store');
const supabaseStore = require('./supabaseStore');

const useDatabase = () => db.isDatabaseEnabled();

const findAccountByEmail = async (email) => {
  if (useDatabase()) return supabaseStore.findAccountByEmail(email);
  const store = jsonStore.load();
  return jsonStore.findAccountByEmail(store, email) || null;
};

const findAccountById = async (id) => {
  if (useDatabase()) return supabaseStore.findAccountById(id);
  const store = jsonStore.load();
  return jsonStore.findAccountById(store, id) || null;
};

const createAccount = async ({ email, passwordHash, name, company }) => {
  if (useDatabase()) {
    return supabaseStore.createAccount({ email, passwordHash, name, company });
  }
  const store = jsonStore.load();
  const account = {
    id: uuidv4(),
    email: email.trim().toLowerCase(),
    passwordHash,
    name: (name || '').trim(),
    company: (company || '').trim(),
    createdAt: new Date().toISOString()
  };
  store.accounts.push(account);
  jsonStore.save(store);
  return account;
};

const recordLicense = async (entry) => {
  if (useDatabase()) {
    const license = await supabaseStore.recordLicense(entry);
    return { license };
  }

  const store = jsonStore.load();
  const license = {
    id: uuidv4(),
    accountId: entry.accountId,
    email: entry.email,
    tier: entry.tier,
    licenseKey: entry.licenseKey,
    instanceId: entry.instanceId || null,
    trial: !!entry.trial,
    features: entry.features || [],
    limits: entry.limits || {},
    createdAt: new Date().toISOString()
  };
  store.licenses.push(license);
  jsonStore.save(store);
  return { license };
};

const findLatestLicense = async (accountId, instanceId) => {
  if (useDatabase()) return supabaseStore.findLatestLicense(accountId, instanceId);

  const store = jsonStore.load();
  return store.licenses
    .filter(l => l.accountId === accountId)
    .filter(l => !instanceId || !l.instanceId || l.instanceId === instanceId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
};

const findLicenseById = async (id) => {
  if (useDatabase()) return supabaseStore.findLicenseById(id);

  const store = jsonStore.load();
  return store.licenses.find(l => l.id === id) || null;
};

const listLicensesByAccount = async (accountId, includeKeys = false) => {
  if (useDatabase()) return supabaseStore.listLicensesByAccount(accountId, includeKeys);

  const store = jsonStore.load();
  return store.licenses
    .filter(l => l.accountId === accountId)
    .map(({ licenseKey, ...rest }) => (includeKeys ? { licenseKey, ...rest } : rest))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const getBackend = () => (useDatabase() ? 'supabase' : 'json');

module.exports = {
  useDatabase,
  getBackend,
  findAccountByEmail,
  findAccountById,
  createAccount,
  recordLicense,
  findLatestLicense,
  findLicenseById,
  listLicensesByAccount
};
