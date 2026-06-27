const API = window.location.origin;
const TOKEN_KEY = 'mantis_portal_token';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden', 'false');
}

function closeModals() {
  $$('.modal').forEach(m => {
    m.classList.add('hidden');
    m.setAttribute('aria-hidden', 'true');
  });
}

function showAuthTab(tab) {
  $$('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $('#form-register').classList.toggle('hidden', tab !== 'register');
  $('#form-login').classList.toggle('hidden', tab !== 'login');
}

async function loadConfig() {
  try {
    const cfg = await api('/api/config');
    if (cfg.mantisInstallUrl) {
      const pre = $('#setup-url-pre');
      if (pre) pre.textContent = cfg.mantisInstallUrl;
      const go = $('#btn-go-setup');
      if (go) go.href = cfg.mantisInstallUrl;
    }
  } catch (_) {}
}

async function openAccountModal() {
  const me = await api('/api/me');
  $('#account-email').textContent = me.email;
  openModal('modal-account');
  await refreshLicenseHistory();
}

async function refreshLicenseHistory() {
  const list = $('#license-history');
  list.innerHTML = '';
  try {
    const keys = await api('/api/licenses/mine/keys');
    keys.slice(0, 5).forEach(k => {
      const li = document.createElement('li');
      li.textContent = `${k.tier} — ${new Date(k.createdAt).toLocaleString()}${k.trial ? ' (trial)' : ''}`;
      list.appendChild(li);
    });
    if (!keys.length) list.innerHTML = '<li>No keys yet — issue one above.</li>';
  } catch {
    list.innerHTML = '<li>Could not load history.</li>';
  }
}

async function issueLicense(tier) {
  const body = { tier };
  if (tier === 'trial') {
    body.tier = 'professional';
    body.trial = true;
  }
  const result = await api('/api/licenses/issue', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  $('#license-tier').textContent = result.tier + (body.trial ? ' (trial)' : '');
  $('#license-key-out').value = result.licenseKey;
  $('#license-result').classList.remove('hidden');
  const go = $('#btn-go-setup');
  if (go && result.setupUrl) go.href = result.setupUrl;
  await refreshLicenseHistory();
}

function afterAuth(data, isRegister = false) {
  setToken(data.token);
  closeModals();
  openAccountModal();
  if (isRegister && data.communityLicense?.licenseKey) {
    $('#license-tier').textContent = data.communityLicense.tier;
    $('#license-key-out').value = data.communityLicense.licenseKey;
    $('#license-result').classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();

  $('#btn-register-header')?.addEventListener('click', () => { showAuthTab('register'); openModal('modal-auth'); });
  $('#btn-login')?.addEventListener('click', () => { showAuthTab('login'); openModal('modal-auth'); });
  $('#btn-hero-start')?.addEventListener('click', () => { showAuthTab('register'); openModal('modal-auth'); });
  $('#btn-cta-start')?.addEventListener('click', () => { showAuthTab('register'); openModal('modal-auth'); });

  $$('[data-tier]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tier = btn.dataset.tier;
      if (!getToken()) {
        showAuthTab('register');
        openModal('modal-auth');
        return;
      }
      try {
        await openAccountModal();
        await issueLicense(tier);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  $$('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => showAuthTab(tab.dataset.tab));
  });

  $$('[data-close]').forEach(el => el.addEventListener('click', closeModals));

  $('#form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#register-error');
    errEl.classList.add('hidden');
    try {
      const data = await api('/api/register', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(fd))
      });
      afterAuth(data, true);
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = $('#login-error');
    errEl.classList.add('hidden');
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(fd))
      });
      afterAuth(data);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  $$('[data-issue]').forEach(btn => {
    btn.addEventListener('click', () => issueLicense(btn.dataset.issue).catch(err => alert(err.message)));
  });

  $('#btn-copy-key')?.addEventListener('click', () => {
    const ta = $('#license-key-out');
    ta.select();
    navigator.clipboard?.writeText(ta.value);
  });

  $('#btn-logout')?.addEventListener('click', () => {
    clearToken();
    closeModals();
  });

  if (getToken()) {
    api('/api/me').then(() => openAccountModal()).catch(clearToken);
  }
});
