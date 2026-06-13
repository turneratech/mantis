# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + client)
npm run install-all

# Development (concurrent server + client with hot reload)
npm run dev

# Server only (nodemon)
npm run server

# Client only (React dev server on :3000)
npm run client

# Production build + start
npm run build && npm start

# Initialize MySQL database
npm run db:init    # runs: mysql -u root -p < server/database/mantis.sql
```

The Express server runs on port 5000 in dev (or `PORT` env var). The React client proxies API calls to `http://localhost:5000` in dev. In production, Express serves the static React build from `client/build/`.

## Architecture

Full-stack **Mantis** app: React 18 frontend + Express.js backend + dual-storage abstraction (MySQL or CSV fallback).

### Storage Abstraction

All data operations go through `server/storage/index.js`, which auto-detects and initializes ONE backend at startup:
1. **MySQL** — if `DB_*` env vars are configured and connection succeeds
2. **CSV fallback** — files in `server/data/*.csv` (zero-config, works without a database)

Any data model change must update **both** implementations: `server/storage/mysql/` and `server/storage/csv/`. The storage type is reported at `GET /api/health`.

### Key Directories

- `server/routes/` — Express API endpoints (auth, bugs, projects, analytics, attachments, email, github-webhook)
- `server/storage/` — Storage abstraction factory + MySQL and CSV implementations
- `server/middleware/` — JWT authentication middleware (`authMiddleware.js`)
- `server/services/` — Business logic (email reports, license validation)
- `server/storage/postgres/` — PostgreSQL/Supabase implementation
- `server/database/mantis.sql` — Full MySQL schema (no migration tool; changes are manual SQL)
- `server/database/mantis.postgres.sql` — PostgreSQL/Supabase schema
- `server/storage/postgres/` — PostgreSQL storage backend
- `client/src/components/` — React UI components (Login, Dashboard, BugForm, BugDetail, etc.)
- `client/src/App.js` — Main routing, Auth context, protected routes

### Authentication & Authorization

- JWT Bearer tokens in `Authorization` header; Axios interceptors add them automatically
- Three roles: `godmode` > `admin` > `user`
- `user` role can only see bugs where they appear as assignee, reporter, QA owner, or in the ARB (Action Required By) field

### Data Model

- **Users**: UUID id, username, bcrypt password, role enum
- **Projects**: UUID id, name, unique key (e.g. `"SM"`), members
- **Bugs**: auto-increment id, composite bug_id (`{projectKey}-{####}` e.g. `SM-0001`), comprehensive fields including severity, priority, status, type (Bug/Enhancement/Task/Feature), assignee, reporter, qa_owner, arb
- **bug_activity**: Audit log of all changes per bug
- **bug_sequences**: Per-project auto-increment counter for bug IDs
- **email_config / email_log**: SMTP settings and send history

### Self-Hosted Deployment

- `server/config/deployment.config.js` — database provider, file storage, webhooks (env + `server/data/deployment.local.json`)
- `server/routes/deployment.js` — admin API for setup, connection tests
- `docs/DEPLOYMENT.md` — Supabase, S3, Azure, webhook integration guide
- `DATABASE_PROVIDER=auto|mysql|postgres|supabase|csv`
- `DEFAULT_STORAGE=local|s3|azure|sharepoint`
- Admin UI: **Deployment** page (`/deployment`)

### Environment Variables

```env
PORT=5000
JWT_SECRET=...
JWT_REFRESH_SECRET=...
DB_HOST=localhost
DB_PORT=3306
DB_USER=mantis
DB_PASSWORD=...
DB_NAME=mantis
DEFAULT_STORAGE=azure       # attachment storage: azure | local
AZURE_STORAGE_CONNECTION_STRING=...
OPENAI_API_KEY=...
```

### Notes

- Default dev credentials: `admin` / `admin123`
- `featureService.min.js` and `licenseService.min.js` in `server/services/` are minified; do not modify them
- The client `homepage` is set to `/mantis` in `client/package.json` for subdirectory deployment
