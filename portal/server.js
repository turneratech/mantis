/**
 * Mantis Portal — product page, registration, and license issuance.
 * Stores accounts/licenses in Supabase when PORTAL_DATABASE_URL is set; else portal/data/store.json.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { ensureKeys, KEY_PATH } = require('./lib/keys');
const storeAdapter = require('./lib/storeAdapter');
const { issueLicense } = require('./lib/licenseIssuer');
const { getAllPlans } = require('./lib/plansBridge');

const PORT = parseInt(process.env.PORTAL_PORT || '4000', 10);
const JWT_SECRET = process.env.PORTAL_JWT_SECRET || 'portal-dev-secret-change-me';
const MANTIS_INSTALL_URL = process.env.MANTIS_INSTALL_URL || 'http://localhost:3000/mantis/setup';

const keys = ensureKeys();
const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://turneratech.com',
    'https://www.turneratech.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const signPortalToken = (account) =>
  jwt.sign({ sub: account.id, email: account.email }, JWT_SECRET, { expiresIn: '7d' });

const portalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const account = await storeAdapter.findAccountById(decoded.sub);
    if (!account) return res.status(401).json({ error: 'Account not found' });
    req.account = account;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
};

const issueAndRecord = async (account, tier, instanceId, trial = false) => {
  const { licenseKey, features, limits } = issueLicense(keys.privateKey, {
    tier,
    account,
    instanceId,
    trial
  });

  const { license } = await storeAdapter.recordLicense({
    accountId: account.id,
    email: account.email,
    tier: trial ? 'professional' : tier,
    licenseKey,
    instanceId,
    trial,
    features,
    limits
  });

  const purchaseToken = jwt.sign(
    { licenseId: license.id, accountId: account.id, tier: license.tier },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  if (storeAdapter.useDatabase()) {
    const supabaseStore = require('./lib/supabaseStore');
    await supabaseStore.recordPurchaseToken(purchaseToken, license.id);
  } else {
    const jsonStore = require('./lib/store');
    const store = jsonStore.load();
    store.purchaseTokens.push({
      token: purchaseToken,
      licenseId: license.id,
      createdAt: new Date().toISOString(),
      used: false
    });
    jsonStore.save(store);
  }

  return { license, licenseKey, purchaseToken, tier: license.tier };
};

// ─── Public config ───────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  res.json({
    product: 'Mantis',
    mantisInstallUrl: MANTIS_INSTALL_URL,
    githubRepo: 'https://github.com/dev-gauravd/mantis',
    registrationRequired: true,
    storeBackend: storeAdapter.getBackend(),
    tiers: ['community', 'professional', 'enterprise'],
    plans: getAllPlans().map(p => ({
      id: p.id,
      name: p.displayName,
      billing: p.billing,
      limits: p.limits,
      featureCount: p.features.length,
      issuable: p.issuable,
      contactSales: p.contactSales
    }))
  });
});

app.get('/api/public-key', (req, res) => {
  res.type('text/plain').send(keys.publicKey);
});

// ─── Accounts ────────────────────────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await storeAdapter.findAccountByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const account = await storeAdapter.createAccount({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      company
    });

    const token = signPortalToken(account);

    // Every registrant gets a Community license (free tier, tracked in licensing DB)
    const issued = await issueAndRecord(account, 'community', null, false);

    res.status(201).json({
      token,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        company: account.company
      },
      communityLicense: {
        licenseId: issued.license.id,
        tier: issued.tier,
        licenseKey: issued.licenseKey,
        features: issued.license.features,
        limits: issued.license.limits
      },
      message: 'Account created. Your free Community license is ready — use it during Mantis setup.'
    });
  } catch (err) {
    console.error('[Portal] Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const account = await storeAdapter.findAccountByEmail(email);
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const latest = await storeAdapter.findLatestLicense(account.id);

    res.json({
      token: signPortalToken(account),
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        company: account.company
      },
      latestLicense: latest ? {
        tier: latest.tier,
        licenseId: latest.id,
        createdAt: latest.createdAt
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', portalAuth, (req, res) => {
  res.json({
    id: req.account.id,
    email: req.account.email,
    name: req.account.name,
    company: req.account.company
  });
});

// ─── Licenses ────────────────────────────────────────────────────────────────

app.get('/api/licenses/mine', portalAuth, async (req, res) => {
  try {
    const licenses = await storeAdapter.listLicensesByAccount(req.account.id, false);
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/licenses/mine/keys', portalAuth, async (req, res) => {
  try {
    const licenses = await storeAdapter.listLicensesByAccount(req.account.id, true);
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/licenses/issue', portalAuth, async (req, res) => {
  try {
    const tier = (req.body.tier || 'community').toLowerCase();
    const instanceId = req.body.instanceId || null;
    const trial = !!req.body.trial;

    if (!['community', 'professional', 'enterprise'].includes(tier) && !trial) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    if (tier === 'enterprise') {
      return res.status(402).json({
        error: 'Enterprise requires sales contact',
        contact: 'sales@turneratech.com'
      });
    }

    const issued = await issueAndRecord(req.account, tier, instanceId, trial);

    res.json({
      licenseId: issued.license.id,
      tier: issued.tier,
      licenseKey: issued.licenseKey,
      purchaseToken: issued.purchaseToken,
      features: issued.license.features,
      limits: issued.license.limits,
      instanceId: issued.license.instanceId,
      setupUrl: MANTIS_INSTALL_URL,
      message: tier === 'community'
        ? 'Community license issued. Fetch or paste this key during Mantis setup.'
        : 'License issued. Paste the key in your Mantis setup wizard.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Used by Mantis setup wizard — email + portal password (+ optional tier). */
app.post('/api/licenses/fetch', async (req, res) => {
  try {
    const { email, password, instanceId, tier, trial } = req.body;
    const account = await storeAdapter.findAccountByEmail(email);
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ error: 'Invalid portal email or password' });
    }

    const requestedTier = (tier || 'community').toLowerCase();

    if (!req.body.forceNew) {
      const existing = await storeAdapter.findLatestLicense(account.id, instanceId || null);
      if (existing) {
        return res.json({
          licenseKey: existing.licenseKey,
          tier: existing.tier,
          features: existing.features,
          limits: existing.limits,
          reused: true,
          setupUrl: MANTIS_INSTALL_URL
        });
      }
    }

    if (requestedTier === 'enterprise') {
      return res.status(402).json({ error: 'Contact sales@turneratech.com for Enterprise' });
    }

    const issued = await issueAndRecord(
      account,
      requestedTier,
      instanceId || null,
      !!trial
    );

    res.json({
      licenseKey: issued.licenseKey,
      tier: issued.tier,
      features: issued.license.features,
      limits: issued.license.limits,
      reused: false,
      setupUrl: MANTIS_INSTALL_URL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/licenses/redeem', async (req, res) => {
  try {
    const { purchaseToken } = req.body;
    if (!purchaseToken) return res.status(400).json({ error: 'purchaseToken required' });

    const decoded = jwt.verify(purchaseToken, JWT_SECRET);
    const license = await storeAdapter.findLicenseById(decoded.licenseId);
    if (!license) return res.status(404).json({ error: 'License not found' });

    res.json({
      licenseKey: license.licenseKey,
      tier: license.tier,
      features: license.features,
      limits: license.limits,
      setupUrl: MANTIS_INSTALL_URL
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired purchase token' });
  }
});

app.post('/api/licenses/validate', (req, res) => {
  try {
    const { licenseKey } = req.body;
    const payload = jwt.verify(licenseKey, keys.publicKey, {
      algorithms: ['ES256'],
      issuer: 'turneratech.com'
    });
    res.json({ valid: true, payload });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     Mantis Portal                         ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log(`  Product page:  http://localhost:${PORT}/`);
  console.log(`  Mantis setup:  ${MANTIS_INSTALL_URL}`);
  console.log(`  License store: ${storeAdapter.getBackend()}`);
  if (storeAdapter.getBackend() === 'json') {
    console.log('  Tip: set PORTAL_DATABASE_URL for Supabase-backed licensing registry');
  }
  console.log('');
  console.log('  Add LICENSE_PUBLIC_KEY to Mantis .env — see:');
  console.log(`  ${path.join(path.dirname(KEY_PATH), 'mantis-env-snippet.txt')}`);
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Portal] Port ${PORT} is already in use.`);
    process.exit(1);
  }
  throw err;
});
