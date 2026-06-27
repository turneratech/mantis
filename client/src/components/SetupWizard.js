import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import logoSmall from '../utils/brandAssets';
import { PORTAL_URL, portalRegisterUrl } from '../config/portal';
import './SetupWizard.css';

const BASE_STEPS = ['welcome', 'admin', 'database', 'storage', 'license', 'done'];

function SetupWizard({ onComplete, initialStatus = null }) {
  const [status, setStatus] = useState(initialStatus);
  const [step, setStep] = useState(0);
  const [providers, setProviders] = useState(null);
  const [settings, setSettings] = useState({
    database: { provider: 'auto', mysql: { host: 'localhost', port: 3306, user: 'mantis', database: 'mantis', password: '' } },
    storage: { default: 'local' }
  });
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  });
  const [authSession, setAuthSession] = useState(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseMode, setLicenseMode] = useState('portal');
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [portalTier, setPortalTier] = useState('community');
  const [testing, setTesting] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const steps = useMemo(() => {
    if (status && !status.needsBootstrapAdmin) {
      return BASE_STEPS.filter(s => s !== 'admin');
    }
    return BASE_STEPS;
  }, [status]);

  useEffect(() => {
    if (initialStatus) return;
    axios.get('/api/setup/status')
      .then(res => setStatus(res.data))
      .catch(() => setStatus({ needsSetup: true, needsBootstrapAdmin: true }));
  }, [initialStatus]);

  useEffect(() => {
    axios.get('/api/setup/providers').then(r => setProviders(r.data)).catch(() => {});
  }, []);

  const currentStep = steps[step];
  const stepNum = step + 1;
  const totalSteps = steps.length;

  const showMsg = (type, text) => setMessage({ type, text });

  const testDatabase = async () => {
    setTesting('db');
    try {
      const res = await axios.post('/api/setup/test/database', {
        provider: settings.database.provider,
        config: settings.database
      });
      showMsg(res.data.success ? 'success' : 'error', res.data.message);
    } catch (err) {
      showMsg('error', err.response?.data?.error || err.response?.data?.message || err.message);
    } finally {
      setTesting('');
    }
  };

  const testStorage = async () => {
    setTesting('storage');
    try {
      const res = await axios.post('/api/setup/test/storage', { provider: settings.storage.default });
      showMsg(res.data.success ? 'success' : 'error', res.data.message);
    } catch (err) {
      showMsg('error', err.response?.data?.error || err.message);
    } finally {
      setTesting('');
    }
  };

  const bootstrapAdmin = async () => {
    const { username, password, confirmPassword, email } = adminForm;
    if (!username.trim() || username.trim().length < 3) {
      showMsg('error', 'Username must be at least 3 characters');
      return false;
    }
    if (password.length < 8) {
      showMsg('error', 'Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      showMsg('error', 'Passwords do not match');
      return false;
    }

    const res = await axios.post('/api/setup/bootstrap-admin', {
      username: username.trim(),
      password,
      email: email.trim()
    });
    setAuthSession(res.data);
    localStorage.setItem('token', res.data.token);
    showMsg('success', `Administrator "${res.data.user.username}" created`);
    return true;
  };

  const fetchPortalLicense = async () => {
    if (!portalEmail.trim() || !portalPassword) {
      showMsg('error', 'Enter your TurnerTech portal email and password');
      return false;
    }
    const res = await fetch(`${PORTAL_URL}/api/licenses/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: portalEmail.trim(),
        password: portalPassword,
        instanceId: status?.instanceId,
        tier: portalTier
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch license');
    setLicenseKey(data.licenseKey);
    setSkipLicense(false);
    showMsg('success', `License fetched (${data.tier}${data.reused ? ', existing key' : ''})`);
    return true;
  };

  const saveAndNext = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      if (currentStep === 'admin') {
        const ok = await bootstrapAdmin();
        if (!ok) return;
      }
      if (currentStep === 'database' || currentStep === 'storage') {
        await axios.post('/api/setup/settings', settings);
        if (currentStep === 'database') {
          showMsg('success', 'Database settings saved. Restart the server after setup for DB changes.');
        }
      }
      if (currentStep === 'license' && licenseMode === 'portal') {
        const ok = await fetchPortalLicense();
        if (!ok) return;
      }
      setStep(s => Math.min(s + 1, steps.length - 1));
    } catch (err) {
      showMsg('error', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const finishSetup = async () => {
    setSaving(true);
    try {
      await axios.post('/api/setup/complete', {
        licenseKey: licenseKey.trim(),
        username: authSession?.user?.username
      });
      onComplete(authSession);
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  if (!status) {
    return <div className="setup-wizard"><div className="setup-wizard-card"><p>Loading setup…</p></div></div>;
  }

  return (
    <div className="setup-wizard">
      <div className="setup-wizard-card">
        <div className="setup-brand">
          <img src={logoSmall} alt="Mantis" className="setup-logo" />
        </div>

        <div className="setup-progress">
          Step {stepNum} of {totalSteps}
          <div className="setup-progress-bar">
            <div className="setup-progress-fill" style={{ width: `${(stepNum / totalSteps) * 100}%` }} />
          </div>
        </div>

        {status.instanceId && (
          <p className="setup-instance-id">Instance ID: <code>{status.instanceId}</code></p>
        )}

        {message.text && (
          <div className={`setup-alert setup-alert-${message.type}`}>{message.text}</div>
        )}

        {currentStep === 'welcome' && (
          <div className="setup-step">
            <h1>Welcome to Mantis</h1>
            <p>
              This wizard configures your self-hosted instance. Your administrator account is created
              here on your server — not on turneratech.com.
            </p>
            <ul className="setup-features">
              <li>Create your local administrator account</li>
              <li>Connect MySQL, PostgreSQL, or Supabase</li>
              <li>Configure file storage (local, S3, Azure)</li>
              <li>Register at TurnerTech portal and activate your license (Community is free)</li>
            </ul>
          </div>
        )}

        {currentStep === 'admin' && (
          <div className="setup-step">
            <h2>Create Administrator</h2>
            <p>This account manages your Mantis instance. Choose a strong password.</p>
            <div className="setup-grid">
              <label>
                Username
                <input
                  value={adminForm.username}
                  onChange={e => setAdminForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                  autoComplete="username"
                />
              </label>
              <label>
                Email <span className="setup-optional">(optional)</span>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={adminForm.confirmPassword}
                  onChange={e => setAdminForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                />
              </label>
            </div>
          </div>
        )}

        {currentStep === 'database' && (
          <div className="setup-step">
            <h2>Database</h2>
            <p>Choose where Mantis stores bugs, projects, and users.</p>
            <label>
              Provider
              <select
                value={settings.database.provider}
                onChange={e => setSettings(s => ({ ...s, database: { ...s.database, provider: e.target.value } }))}
              >
                {(providers?.databaseProviders || ['auto', 'mysql', 'supabase', 'postgres', 'csv']).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            {['mysql', 'auto'].includes(settings.database.provider) && (
              <div className="setup-grid">
                <label>Host<input value={settings.database.mysql.host} onChange={e => setSettings(s => ({ ...s, database: { ...s.database, mysql: { ...s.database.mysql, host: e.target.value } } }))} /></label>
                <label>Port<input type="number" value={settings.database.mysql.port} onChange={e => setSettings(s => ({ ...s, database: { ...s.database, mysql: { ...s.database.mysql, port: +e.target.value } } }))} /></label>
                <label>User<input value={settings.database.mysql.user} onChange={e => setSettings(s => ({ ...s, database: { ...s.database, mysql: { ...s.database.mysql, user: e.target.value } } }))} /></label>
                <label>Password<input type="password" value={settings.database.mysql.password} onChange={e => setSettings(s => ({ ...s, database: { ...s.database, mysql: { ...s.database.mysql, password: e.target.value } } }))} /></label>
                <label>Database<input value={settings.database.mysql.database} onChange={e => setSettings(s => ({ ...s, database: { ...s.database, mysql: { ...s.database.mysql, database: e.target.value } } }))} /></label>
              </div>
            )}
            {['supabase', 'postgres'].includes(settings.database.provider) && (
              <div className="setup-grid">
                <label>Supabase URL<input placeholder="https://xxx.supabase.co" onChange={e => setSettings(s => ({ ...s, database: { ...s.database, supabase: { url: e.target.value } } }))} /></label>
                <label>Postgres URL<input type="password" placeholder="postgresql://..." onChange={e => setSettings(s => ({ ...s, database: { ...s.database, postgres: { connectionString: e.target.value }, supabase: { databaseUrl: e.target.value } } }))} /></label>
              </div>
            )}
            <button type="button" className="btn-secondary" onClick={testDatabase} disabled={testing === 'db'}>
              {testing === 'db' ? 'Testing…' : 'Test Connection'}
            </button>
          </div>
        )}

        {currentStep === 'storage' && (
          <div className="setup-step">
            <h2>File Storage</h2>
            <p>Where should bug attachments be stored?</p>
            <label>
              Default provider
              <select
                value={settings.storage.default}
                onChange={e => setSettings(s => ({ ...s, storage: { ...s.storage, default: e.target.value } }))}
              >
                {(providers?.fileStorageProviders || ['local', 's3', 'azure']).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <p className="setup-hint">Configure S3/Azure credentials in <code>.env</code> before selecting cloud storage.</p>
            <button type="button" className="btn-secondary" onClick={testStorage} disabled={testing === 'storage'}>
              {testing === 'storage' ? 'Testing…' : 'Test Storage'}
            </button>
          </div>
        )}

        {currentStep === 'license' && (
          <div className="setup-step">
            <h2>License — registration required</h2>
            <p>
              Register free at the{' '}
              <a href={portalRegisterUrl()} target="_blank" rel="noopener noreferrer">TurnerTech portal</a>
              {' '}(local: {PORTAL_URL}). Every Community user gets a free license key tied to your account.
              Use your <strong>portal</strong> email and password below — not your Mantis admin password.
            </p>

            <div className="setup-license-tabs">
              <button
                type="button"
                className={licenseMode === 'portal' ? 'setup-tab active' : 'setup-tab'}
                onClick={() => setLicenseMode('portal')}
              >
                Fetch online (recommended)
              </button>
              <button
                type="button"
                className={licenseMode === 'paste' ? 'setup-tab active' : 'setup-tab'}
                onClick={() => setLicenseMode('paste')}
              >
                Paste key
              </button>
            </div>

            {licenseMode === 'portal' && (
              <div className="setup-grid">
                <label>
                  Portal email
                  <input
                    type="email"
                    value={portalEmail}
                    onChange={e => setPortalEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                </label>
                <label>
                  Portal password
                  <input
                    type="password"
                    value={portalPassword}
                    onChange={e => setPortalPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <label>
                  Tier
                  <select value={portalTier} onChange={e => setPortalTier(e.target.value)}>
                    <option value="community">Community (Free)</option>
                    <option value="professional">Professional</option>
                  </select>
                </label>
              </div>
            )}

            {(licenseMode === 'paste' || licenseKey) && (
              <label>
                License key
                <textarea
                  rows={4}
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  placeholder="Paste JWT license key from portal registration…"
                />
              </label>
            )}

            <p className="setup-hint">
              New users: register on the portal first — a Community license is issued automatically.
            </p>
            <p className="setup-hint">
              Ensure <code>LICENSE_PUBLIC_KEY</code> in Mantis <code>.env</code> matches the portal public key
              (see <code>portal/data/mantis-env-snippet.txt</code> after first portal start).
            </p>
          </div>
        )}

        {currentStep === 'done' && (
          <div className="setup-step">
            <h2>You&apos;re all set!</h2>
            <p>Mantis is configured. Fine-tune settings anytime under <strong>Deployment</strong> in the nav bar.</p>
            {settings.database.provider !== 'csv' && (
              <p className="setup-hint">If you changed the database provider, restart the server before using the app.</p>
            )}
          </div>
        )}

        <div className="setup-actions">
          {step > 0 && currentStep !== 'done' && (
            <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {currentStep !== 'done' && currentStep !== 'license' && (
            <button type="button" className="btn-primary" onClick={saveAndNext} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          )}
          {currentStep === 'license' && (
            <button
              type="button"
              className="btn-primary"
              onClick={saveAndNext}
              disabled={saving || (
                licenseMode === 'paste' ? !licenseKey.trim() :
                !portalEmail.trim() || !portalPassword
              )}
            >
              {saving ? 'Fetching…' : 'Continue'}
            </button>
          )}
          {currentStep === 'done' && (
            <button type="button" className="btn-primary" onClick={finishSetup} disabled={saving}>
              {saving ? 'Finishing…' : 'Go to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupWizard;
