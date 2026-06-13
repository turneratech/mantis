<p align="center">
  <img src="./imgs/logo_mid.png" alt="Mantis" width="140">
</p>

<h1 align="center">Mantis</h1>

<p align="center">
  <strong>Self-hosted, multi-project bug tracking — MySQL, PostgreSQL/Supabase, or zero-config CSV</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#licensing">Licensing</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/react-18.x-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/MySQL-8.x-orange.svg" alt="MySQL">
  <img src="https://img.shields.io/badge/PostgreSQL-15+-336791.svg" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
</p>

---

## Overview

**Mantis** is an enterprise-ready bug tracker for software teams. It ships as a **downloadable, licensable** package you host on your own infrastructure (EC2, on-prem, Docker, or local dev).

- **Flexible database** — MySQL, PostgreSQL/Supabase, or CSV (evaluation / air-gapped demo)
- **Flexible file storage** — local disk, S3, Azure Blob, SharePoint, Supabase Storage
- **Outbound webhooks & plugins** — sync bugs to your data warehouse or internal systems
- **Tiered licensing** — Community through Enterprise ([details](#licensing))
- **First-run setup wizard** — configure database, storage, and license after install

Built with React 18, Express, and a storage abstraction layer so application code stays backend-agnostic.

---

## Screenshots

<p align="center">
  <img src="./imgs/dashboard_img.png" alt="Mantis admin dashboard" width="900">
</p>

<p align="center">
  <em>Admin dashboard — project health, bug metrics, and team activity</em>
</p>

<p align="center">
  <img src="./imgs/logo_small.png" alt="Mantis logo mark" width="80">
</p>

---

## Features

### Bug tracking
| | |
|---|---|
| Multi-project | Unique bug IDs per project (`SM-0001`, `RM-0042`, …) |
| Rich fields | Severity, priority, status, type, assignee, QA owner, ARB, attachments |
| Workflow | Open → In Progress → Resolved → Closed → Reopened |
| Activity log | Full audit trail of changes and comments |
| Role visibility | Users see only bugs they own, report, QA, or appear on ARB |

### Administration
| | |
|---|---|
| **Roles** | `godmode` → `admin` → `user` |
| Users & projects | CRUD, members, password reset |
| **Deployment UI** | Database, storage, webhooks, plugins, license (`/deployment`) |
| **Setup wizard** | First-run guide for CSV / new installs |
| Email reports | Scheduled SMTP reports (requires MySQL/PostgreSQL) |
| GitHub webhooks | Link commits to bugs |

### Self-hosted deployment
| | |
|---|---|
| Database | `auto`, `mysql`, `postgres`, `supabase`, `csv` |
| Attachments | `local`, `s3`, `azure`, `sharepoint`, `supabase` |
| Integrations | Signed outbound webhooks, `server/plugins/` loader |
| Health API | `GET /api/health` — storage type, DB connection, file providers |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React client (homepage: /mantis)                             │
│  Login · Dashboard · Bugs · Projects · Deployment · License   │
└────────────────────────────┬─────────────────────────────────┘
                             │ REST /api/*
┌────────────────────────────▼─────────────────────────────────┐
│  Express server (port 5000)                                   │
│  auth · bugs · projects · analytics · attachments · deployment  │
│  license · email · github-webhook                             │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   MySQL / Postgres      CSV files          hybrid-storage
   (production)       (demo / fallback)    (S3 · Azure · local)
```

**Startup detection** (`DATABASE_PROVIDER`):

1. `csv` → CSV only  
2. `postgres` / `supabase` → PostgreSQL  
3. `mysql` → MySQL  
4. `auto` (default) → try MySQL, then PostgreSQL, then CSV fallback  

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Supabase, S3, Azure, and webhook setup.

---

## Quick Start

### Prerequisites

- **Node.js** 16+ and **npm** 8+
- **MySQL 8** or **PostgreSQL** (optional — CSV mode needs no database)
- **Git**

### 1. Clone and install

```bash
git clone https://github.com/dev-gauravd/mantis.git
cd mantis
cp .env.example .env
npm run install-all
cd hybrid-storage && npm install && cd ..
```

### 2. Choose a run mode

**Option A — CSV (fastest, no database)**

```bash
# In .env set:
# DATABASE_PROVIDER=csv

npm run dev
```

**Option B — MySQL (production)**

```bash
mysql -u root -p -e "CREATE DATABASE mantis;"
mysql -u root -p mantis < server/database/mantis.sql
mysql -u root -p mantis < server/database/license_schema.sql
mysql -u root -p mantis < server/database/deployment_schema.sql

# Edit .env with DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# DATABASE_PROVIDER=mysql   (or auto)

npm run dev
```

**Option C — PostgreSQL / Supabase**

```bash
psql "$DATABASE_URL" -f server/database/mantis.postgres.sql
# DATABASE_PROVIDER=postgres  or  supabase
npm run dev
```

### 3. Open the app

| | |
|---|---|
| **Dev UI** | [http://localhost:3000/mantis](http://localhost:3000/mantis) |
| **API** | [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| **Default login** | `admin` / `admin123` |

> The React app is served under **`/mantis`** (see `client/package.json` → `homepage`).  
> In dev, the client proxies `/mantis/api` to the Express server on port **5000**.

### 4. First-run setup (CSV mode)

After logging in as **admin**, the **Setup Wizard** walks through:

1. Welcome  
2. Database provider (optional upgrade from CSV)  
3. File storage (local / S3 / Azure)  
4. License key (or skip for Community Edition)  
5. Finish  

Ongoing changes: **Admin → Deployment** (`/deployment`).

### Production build

```bash
npm run build
NODE_ENV=production npm start
# App + API at http://localhost:5000/mantis
```

---

## Configuration

Copy `.env.example` to `.env` and adjust:

```env
# Server
PORT=5000
NODE_ENV=development
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-too

# Database: auto | mysql | postgres | supabase | csv
DATABASE_PROVIDER=auto
DB_HOST=localhost
DB_PORT=3306
DB_USER=mantis
DB_PASSWORD=
DB_NAME=mantis
DATABASE_URL=postgresql://user:pass@localhost:5432/mantis

# File attachments: local | s3 | azure | sharepoint | supabase
DEFAULT_STORAGE=local

# Optional
OPENAI_API_KEY=           # AI insights in email reports
WEBHOOKS_ENABLED=true
WEBHOOK_SECRET=
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_PROVIDER=csv` | Zero-config demo; data in `server/data/*.csv` |
| `DATABASE_PROVIDER=auto` | Try MySQL → Postgres → CSV |
| `DEFAULT_STORAGE` | Attachment backend (install `hybrid-storage` deps first) |
| `server/data/deployment.local.json` | UI-saved deployment settings (gitignored) |

Full reference: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Project structure

```
mantis/
├── client/                 # React 18 frontend (base path /mantis)
│   ├── public/             # favicon.ico, index.html
│   └── src/
│       ├── components/     # UI + SetupWizard, DeploymentConfig
│       ├── contexts/       # LicenseContext
│       └── assets/         # Bundled logo
├── server/
│   ├── config/             # deployment, license, features
│   ├── database/           # mantis.sql, mantis.postgres.sql, license_schema.sql
│   ├── data/               # Runtime CSV + deployment.local.json (gitignored)
│   ├── plugins/            # Webhook plugin loader
│   ├── routes/             # REST API
│   ├── services/           # license, email, webhooks, file storage
│   └── storage/            # mysql · postgres · csv abstraction
├── hybrid-storage/         # S3 / Azure / SharePoint providers
├── imgs/                   # Logo + README screenshots
├── docs/DEPLOYMENT.md      # Self-hosted deployment guide
├── .env.example
└── package.json
```

---

## API overview

| Area | Base path | Notes |
|------|-----------|--------|
| Health | `GET /api/health` | Storage type, DB connection, file providers |
| Auth | `/api/auth/*` | JWT login, users, change password |
| Bugs | `/api/bugs/*` | CRUD, comments, activity |
| Projects | `/api/projects/*` | CRUD, members |
| Analytics | `/api/analytics/*` | Dashboards, reports |
| Attachments | `/api/attachments/*` | Upload / download |
| Deployment | `/api/deployment/*` | Setup, DB/storage tests, webhooks |
| License | `/api/license/*` | Status, activate, limits |

```bash
# Example: health check
curl http://localhost:5000/api/health

# Example: login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Deployment

Mantis is designed for **self-hosted** installs on EC2, VPS, or on-prem.

### Checklist

- [ ] Strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] MySQL or PostgreSQL (not CSV) for production
- [ ] `DEFAULT_STORAGE` = S3 or Azure (not local)
- [ ] `npm run build && NODE_ENV=production npm start`
- [ ] Reverse proxy with base path `/mantis`
- [ ] Activate license (or use Community limits)
- [ ] Back up database and object storage

### Nginx example (`/mantis` base path)

```nginx
server {
    listen 80;
    server_name bugs.example.com;

    location /mantis/ {
        proxy_pass http://127.0.0.1:5000/mantis/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Detailed guide: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

---

## Licensing

| Tier | Users | Projects | Highlights |
|------|-------|----------|------------|
| **Community** | 5 | 3 | Core tracking, GitHub basic — no key required |
| **Professional** | Unlimited | Unlimited | AI insights, advanced reports, cloud storage |
| **Enterprise** | Unlimited | Unlimited | SSO, audit logs, webhooks, white-label |
| **Cloud** | Per seat | Unlimited | Managed hosting by [TurneraTech](https://turneratech.com) |

Activate a key in **Admin → Deployment → License** or via `POST /api/license/activate`.  
License activation requires **MySQL or PostgreSQL** (not CSV-only mode).

---

## Security

| Priority | Action |
|----------|--------|
| Critical | Change default `admin` / `admin123` immediately |
| Critical | Set unique `JWT_SECRET` in production |
| High | Use HTTPS (TLS termination at Nginx / load balancer) |
| High | Restrict database and S3 credentials via env vars, not commits |
| Medium | Keep dependencies updated (`npm audit`) |

---

## Development scripts

| Command | Description |
|---------|-------------|
| `npm run install-all` | Install root + client dependencies |
| `npm run dev` | Server (nodemon :5000) + client (:3000) |
| `npm run server` | Backend only |
| `npm run client` | Frontend only |
| `npm run build` | Production React build → `client/build` |
| `npm start` | Run server (serves build when `NODE_ENV=production`) |
| `npm run db:init` | Apply MySQL schema (`server/database/mantis.sql`) |

---

## Contributing

1. Fork the repository  
2. Create a branch: `git checkout -b feature/my-feature`  
3. Commit with clear messages  
4. Open a Pull Request  

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Support

| | |
|---|---|
| **Deployment docs** | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Issues** | [GitHub Issues](https://github.com/dev-gauravd/mantis/issues) |
| **License keys** | [turneratech.com](https://turneratech.com) |
| **Email** | support@turneratech.com |

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">
  <img src="./imgs/logo_tiny.png" alt="Mantis" width="32">
  <br>
  Made with care by <a href="https://turneratech.com">TurneraTech</a>
</p>
