import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useLicense } from '../hooks/useLicense';
import './SetupWizard.css';

const STEPS = ['welcome', 'database', 'storage', 'license', 'done'];

function SetupWizard({ onComplete }) {
  const { user } = useAuth();
  const { license, activateLicense, refreshLicense } = useLicense();
  const [step, setStep] = useState(0);
  const [providers, setProviders] = useState(null);
  const [settings, setSettings] = useState({
    database: { provider: 'auto', mysql: { host: 'localhost', port: 3306, user: 'mantis', database: 'mantis', password: '' } },
    storage: { default: 'local' }
  });
  const [licenseKey, setLicenseKey] = useState('');
  const [skipLicense, setSkipLicense] = useState(false);
  const [testing, setTesting] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/deployment/providers').then(r => setProviders(r.data)).catch(() => {});
  }, []);

  const currentStep = STEPS[step];
  const stepNum = step + 1;
  const totalSteps = STEPS.length;

  const showMsg = (type, text) => setMessage({ type, text });

  const testDatabase = async () => {
    setTesting('db');
    try {
      const res = await axios.post('/api/deployment/test/database', {
        provider: settings.database.provider,
        config: settings.database
      });
      showMsg(res.data.success ? 'success' : 'error', res.data.message);
    } catch (err) {
      showMsg('error', err.response?.data?.message || err.message);
    } finally {
      setTesting('');
    }
  };

  const testStorage = async () => {
    setTesting('storage');
    try {
      const res = await axios.post('/api/deployment/test/storage', { provider: settings.storage.default });
      showMsg(res.data.success ? 'success' : 'error', res.data.message);
    } catch (err) {
      showMsg('error', err.message);
    } finally {
      setTesting('');
    }
  };

  const saveAndNext = async () => {
    setSaving(true);
    try {
      if (currentStep === 'database' || currentStep === 'storage') {
        await axios.post('/api/deployment/settings', settings);
        if (currentStep === 'database') {
          showMsg('success', 'Database settings saved. Restart server after setup for DB changes.');
        }
      }
      if (currentStep === 'license' && licenseKey.trim()) {
        await activateLicense(licenseKey.trim());
        await refreshLicense();
        showMsg('success', 'License activated!');
      }
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      showMsg('error', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const finishSetup = async () => {
    setSaving(true);
    try {
      await axios.post('/api/deployment/setup/complete', { licenseSkipped: skipLicense || license.tier === 'community' });
      onComplete();
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-wizard">
      <div className="setup-wizard-card">
        <div className="setup-progress">
          Step {stepNum} of {totalSteps}
          <div className="setup-progress-bar">
            <div className="setup-progress-fill" style={{ width: `${(stepNum / totalSteps) * 100}%` }} />
          </div>
        </div>

        {message.text && (
          <div className={`setup-alert setup-alert-${message.type}`}>{message.text}</div>
        )}

        {currentStep === 'welcome' && (
          <div className="setup-step">
            <h1>Welcome to Mantis</h1>
            <p>Let&apos;s configure your self-hosted bug tracker. You&apos;ll connect your database, file storage, and optional license key.</p>
            <ul className="setup-features">
              <li>Bring your own MySQL, PostgreSQL, or Supabase database</li>
              <li>Store attachments on S3, Azure, SharePoint, or locally</li>
              <li>Sync events to external systems via webhooks</li>
              <li>Community Edition works free — upgrade anytime</li>
            </ul>
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
            <h2>License</h2>
            <p>Enter your license key from turneratech.com, or continue with Community Edition (5 users, 3 projects).</p>
            <p className="setup-tier">Current tier: <strong>{license.tier}</strong></p>
            <label>
              License key
              <textarea
                rows={4}
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder="Paste JWT license key…"
              />
            </label>
            <label className="setup-checkbox">
              <input type="checkbox" checked={skipLicense} onChange={e => setSkipLicense(e.target.checked)} />
              Continue with Community Edition for now
            </label>
          </div>
        )}

        {currentStep === 'done' && (
          <div className="setup-step">
            <h2>You&apos;re all set!</h2>
            <p>Mantis is configured. Fine-tune settings anytime under <strong>Deployment</strong> in the nav bar.</p>
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
              disabled={saving || (!licenseKey.trim() && !skipLicense)}
            >
              {saving ? 'Activating…' : 'Continue'}
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
