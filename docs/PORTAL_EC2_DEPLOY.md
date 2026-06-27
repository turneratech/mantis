# Portal API on EC2 (Namecheap + EC2 split)

Your WordPress page at **https://turneratech.com/mantis/** is static HTML + JavaScript. The **Register** form calls a separate **License Portal API** — it does not run on Namecheap shared hosting.

## Why the form does nothing today

The page posts to:

```
https://license.turneratech.com/api/register
```

That host is **not running** the Mantis portal yet (503 / unreachable). Namecheap only serves WordPress; it cannot run the Node.js license server.

Also verify `/mantis/` is **not** in WordPress maintenance mode when testing.

---

## Recommended architecture

```
┌─────────────────────────────┐     HTTPS      ┌──────────────────────────────┐
│  Namecheap (WordPress)      │                │  AWS EC2 (small instance)     │
│  turneratech.com/mantis/    │  ──fetch──►    │  license.turneratech.com      │
│  • Marketing HTML (Elementor)│                │  • portal/server.js (Node)    │
│  • No database for licenses │                │  • portal/data/store.json     │
└─────────────────────────────┘                │  • Nginx + Let's Encrypt SSL  │
                                                └──────────────────────────────┘

Optional second EC2 (or same box later):
  • demo.turneratech.com → full Mantis app (bug tracker UI)
  • Customer self-hosted installs run on THEIR servers
```

| Component | Where | Purpose |
|-----------|--------|---------|
| Marketing page | Namecheap | Product info, register form UI |
| License API | EC2 | Accounts, JWT license keys |
| Mantis app (demo) | EC2 (optional) | Live demo / your own install |
| Customer Mantis | Customer EC2/on-prem | Self-hosted after download |

---

## Step 1 — EC2 instance (portal only)

1. Launch **Ubuntu 22.04** (e.g. `t3.micro` or `t3.small`)
2. Security group inbound:
   - **22** SSH (your IP)
   - **80** HTTP
   - **443** HTTPS
3. Allocate an **Elastic IP** and attach it

---

## Step 2 — DNS at Namecheap

Advanced DNS for `turneratech.com`:

| Type | Host | Value |
|------|------|--------|
| A | `license` | `<EC2 Elastic IP>` |

Result: `https://license.turneratech.com` → your EC2 box.

---

## Step 3 — Install portal on EC2

SSH into the instance:

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git

# Clone (or scp only the portal/ folder)
git clone https://github.com/dev-gauravd/mantis.git
cd mantis/portal
npm install

# Environment
cp .env.example .env
nano .env
```

`.env` on EC2:

```env
PORTAL_PORT=4000
PORTAL_JWT_SECRET=<long-random-string>
MANTIS_INSTALL_URL=https://turneratech.com/mantis/#setup
NODE_ENV=production
```

Run with PM2:

```bash
sudo npm install -g pm2
pm2 start server.js --name mantis-portal
pm2 save
pm2 startup
```

On first start, keys are written to `portal/data/mantis-env-snippet.txt` — **save this** for Mantis installs.

---

## Step 4 — Nginx + SSL

```bash
sudo nano /etc/nginx/sites-available/license
```

```nginx
server {
    listen 80;
    server_name license.turneratech.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/license /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d license.turneratech.com
```

Test:

```bash
curl https://license.turneratech.com/api/config
```

---

## Step 5 — WordPress page config

In your Elementor HTML widget, confirm:

```javascript
const MANTIS_CONFIG = {
  portalApiUrl: 'https://license.turneratech.com',
  githubUrl: 'https://github.com/dev-gauravd/mantis',
  docsUrl: 'https://github.com/dev-gauravd/mantis/blob/main/docs/DEPLOYMENT.md',
  salesEmail: 'sales@turneratech.com'
};
```

Re-publish the page. Open browser **DevTools → Console** and try Register again — you should see a clear error or success.

**Tip:** Update `portal/wordpress/mantis-elementor.html` in the repo (better error messages) and re-paste into Elementor if the form still fails silently.

---

## Step 6 — Backups (important)

Portal stores accounts/licenses in:

```
portal/data/store.json
portal/data/license-keys.json
```

On EC2, back up daily (cron + S3 or download):

```bash
tar czf portal-data-$(date +%F).tar.gz data/
```

No MySQL required for the license portal at this scale.

---

## Step 7 — Mantis demo (optional, same or second EC2)

When you want a live demo bug tracker (not just licenses):

1. Second subdomain: `demo.turneratech.com` → EC2
2. Run full Mantis (`npm run build`, MySQL or CSV, PM2)
3. Copy `LICENSE_PUBLIC_KEY` from portal EC2 into Mantis `.env`
4. Complete `/mantis/setup` once

Customers who **self-host** run Mantis on **their** servers; they only need a license key from your portal.

---

## Checklist

- [ ] EC2 running, Elastic IP attached
- [ ] DNS `license.turneratech.com` → EC2
- [ ] `curl https://license.turneratech.com/api/config` returns JSON
- [ ] WordPress `MANTIS_CONFIG.portalApiUrl` points to that URL
- [ ] WordPress maintenance mode off for `/mantis/`
- [ ] Register form shows success or a visible error
- [ ] Backup `portal/data/` on a schedule

---

## Professional tier / payments (later)

Namecheap + static HTML cannot process payments. Options:

1. **Stripe Payment Link** on “Buy Now” → webhook on EC2 issues license
2. **Manual:** Professional requests email `sales@turneratech.com`, you issue key in admin

Phase 3 of the roadmap — not required for Community registration to work.

---

## Quick test without WordPress

```bash
curl -X POST https://license.turneratech.com/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test"}'
```

If this works, WordPress will work once CORS includes `https://turneratech.com` (already configured in `portal/server.js`).
