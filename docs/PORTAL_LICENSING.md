# Portal Licensing Registry (Supabase)

TurnerTech maintains a **central licensing database** (Supabase/PostgreSQL) for all portal users — Community, Professional, Enterprise, and Cloud. Every Community user must register; a free license JWT is issued automatically and stored with tier **features** and **limits** flags.

This is **separate** from each customer's Mantis app database (bugs, users, projects).

## Architecture

```mermaid
flowchart LR
  Website["turneratech.com/mantis"]
  Portal["Portal API license.turneratech.com"]
  Supabase["Supabase portal_* tables"]
  MantisSetup["Customer /mantis/setup"]
  MantisApp["Customer Mantis instance"]

  Website -->|Register| Portal
  Portal -->|accounts + licenses| Supabase
  MantisSetup -->|fetch license JWT| Portal
  MantisSetup -->|activate key| MantisApp
```

| Store | Purpose |
|-------|---------|
| **Supabase `portal_accounts`** | TurnerTech registration (email, name, company) |
| **Supabase `portal_licenses`** | Issued JWT keys + tier + `features` JSON + `limits` JSON |
| **Customer Mantis `licenses` table** | Active license on their server (or `deployment.local.json` in CSV mode) |

## Community user journey

1. Visit https://turneratech.com/mantis/ → **Get Started Free**
2. Scroll to **Register & issue your license key** → create portal account
3. Portal **auto-issues Community license** (stored in Supabase with feature/limit snapshot)
4. Copy license JWT from the page
5. Clone Mantis, run `npm run install-all && npm run dev`
6. Open `/mantis/setup` → create **local admin** → database/storage → **fetch license** with portal email/password (or paste key)
7. Finish setup → Community tier active (tracked registration + enforced limits)

**Two passwords:**

- **Portal password** — turneratech.com / license API (licensing only)
- **Mantis admin password** — created in setup wizard on customer's server

## Supabase setup (production)

1. Create a Supabase project (dedicated to licensing, not customer bug data)
2. SQL Editor → run [`portal/database/portal.supabase.sql`](../portal/database/portal.supabase.sql)
3. Copy Postgres URI → `portal/.env`:

```env
PORTAL_DATABASE_URL=postgresql://postgres.[ref]:[password]@....pooler.supabase.com:6543/postgres
PORTAL_JWT_SECRET=long-random-secret
MANTIS_INSTALL_URL=https://your-mantis-host/mantis/setup
```

4. Deploy portal to EC2 → https://license.turneratech.com
5. Copy `LICENSE_PUBLIC_KEY` from portal startup snippet into each Mantis instance `.env`

Without `PORTAL_DATABASE_URL`, the portal falls back to `portal/data/store.json` (local dev only).

## Local development

```bash
# Terminal 1 — optional Supabase: set PORTAL_DATABASE_URL in portal/.env
cd D:\Code\Mantis\mantis
npm run portal:install
npm run portal          # http://localhost:4000

# Terminal 2
npm run dev             # http://localhost:3000/mantis/setup
```

1. Register at http://localhost:4000 → Community key shown immediately
2. Copy `LICENSE_PUBLIC_KEY` into root `.env`, restart server
3. Complete setup wizard with portal credentials

## API changes

| Endpoint | Behavior |
|----------|----------|
| `POST /api/register` | Creates account + **auto-issues Community license**; returns `communityLicense.licenseKey` |
| `POST /api/licenses/fetch` | Setup wizard — returns existing or new license with `features` + `limits` |
| `GET /api/config` | Returns `registrationRequired: true` + plan catalog |

## Tier privileges in database

Each `portal_licenses` row stores:

- `tier` — `community` \| `professional` \| `enterprise` \| `cloud`
- `features` — JSON array from [`server/config/plans.js`](../server/config/plans.js)
- `limits` — JSON object (`maxUsers`, `maxProjects`, `maxBugs`, etc.)

JWT payload mirrors these values at issue time. Mantis enforces tier via [`server/config/features.js`](../server/config/features.js) after activation.

## Setup wizard (mandatory registration)

The skip-license option was removed. Users must:

- **Fetch online** with portal email/password, or
- **Paste** a JWT from portal registration

Dev bypass: `MANTIS_DEV_DEFAULTS=true` still allows legacy skip via API only (not exposed in UI).

CSV storage mode: validated license JWT is saved to `server/data/deployment.local.json` as `activatedLicenseKey`.
