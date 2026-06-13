# Mantis Project Cache

Last scanned: 2026-06-12.

Use this file as a compact context cache for future AI/code-agent work. It summarizes the repo shape, entry points, and high-value files to inspect first. Treat it as a navigation aid, not as a substitute for reading the exact file before editing.

## Project Summary

Mantis is a full-stack bug tracking app with:

- React 18 client in `client/`
- Express server in `server/`
- Dual data storage abstraction: MySQL first, CSV fallback
- Attachment storage via local files or cloud providers through `hybrid-storage/`
- JWT authentication with roles: `godmode`, `admin`, `user`
- License and feature gating currently present in the working tree

Main runtime:

- Server entry: `server/index.js`
- Client entry: `client/src/index.js`
- Client app/router/auth context: `client/src/App.js`
- Storage factory: `server/storage/index.js`

## Commands

Run from repo root:

- `npm run install-all` - install root and client dependencies
- `npm run dev` - run Express server and React client together
- `npm run server` - run `server/index.js` with nodemon
- `npm run client` - run React dev server from `client/`
- `npm run build` - build React client
- `npm start` - run production Express server
- `npm run db:init` - initializes MySQL from `server/database/mantis.sql`

Client-specific commands:

- `cd client && npm start`
- `cd client && npm run build`

## Deployment Shape

The client is configured for subdirectory deployment:

- `client/package.json` has `homepage: "/mantis"`
- `client/src/App.js` uses `BrowserRouter basename="/mantis"`
- `client/src/App.js` sets `axios.defaults.baseURL = "/mantis"`
- React dev proxy is in `client/src/setupProxy.js`
- Production Express serves `client/build` when `NODE_ENV === "production"`

## Backend Architecture

`server/index.js`:

- Loads environment with `dotenv`
- Sets CORS for localhost and a known IP
- Skips JSON body parsing for `/api/webhooks/github` so HMAC verification can use the raw body
- Serves local uploads from `/uploads`
- Attaches license info to every request via `attachLicenseInfo`
- Mounts API route modules
- Initializes storage, then license service, then starts Express
- Initializes email service after server startup
- Provides `GET /api/health`

Mounted route modules:

- `/api/auth` -> `server/routes/auth.js`
- `/api/bugs` -> `server/routes/bugs.js`
- `/api/projects` -> `server/routes/projects.js`
- `/api/analytics` -> `server/routes/analytics.js`
- `/api/attachments` -> `server/routes/attachments.js`
- `/api/webhooks` -> `server/routes/github-webhook.js`
- `/api/email` -> `server/routes/email.js`
- `/api/license` -> `server/routes/license.js`

Important middleware/services:

- `server/middleware/auth.js` - JWT auth middleware and token generation
- `server/middleware/licenseValidator.js` - attaches license state, gates features, checks limits
- `server/services/licenseService.js` - license status, activation, validation, cached community fallback
- `server/services/featureService.js` - feature availability and feature usage logging
- `server/services/emailService.js` - SMTP config and scheduled report handling
- `server/utils/jwtHelper.js` - ES256 license JWT helpers

## Storage Architecture

All normal app data access should go through `server/storage/index.js`, which:

- Tries MySQL via `server/storage/mysql/`
- Checks that database tables exist
- Falls back to CSV via `server/storage/csv/`
- Exposes proxy methods so route code can call storage directly

Storage contract is documented in `server/storage/interface.js`.

When changing users, projects, bugs, analytics, or shared model behavior, update both:

- `server/storage/mysql/index.js`
- `server/storage/csv/index.js`

Storage-related files:

- `server/storage/index.js` - factory and proxy exports
- `server/storage/interface.js` - method contract documentation
- `server/storage/mysql/index.js` - MySQL implementation
- `server/storage/mysql/db.js` - MySQL pool/query helpers and database checks
- `server/storage/csv/index.js` - CSV implementation
- `server/storage/csv/csvHandler.js` - CSV read/write helpers
- `server/data/*.csv` - runtime CSV data files when fallback mode is used

Core storage methods include:

- Users: `getUserById`, `getUserByUsername`, `getAllUsers`, `createUser`, `deleteUser`, `updateUserPassword`
- Projects: `getAllProjects`, `getProjectById`, `getProjectByKey`, `createProject`, `updateProject`, `deleteProject`, `addProjectMember`, `removeProjectMember`
- Bugs: `getAllBugs`, `getBugsByProject`, `getBugsByUser`, `getBugById`, `generateBugId`, `createBug`, `updateBug`, `deleteBug`, `addBugComment`, `addBugActivity`, `getBugStats`
- Analytics: `getAdminAnalytics`, `getUserDashboard`

## Data Model

Primary MySQL schema:

- `server/database/mantis.sql`

Primary tables:

- `users`
- `projects`
- `project_members`
- `bugs`
- `bug_activity`
- `bug_sequences`
- `email_config`
- `scheduled_reports`
- `report_recipients`
- `email_log`

License schema:

- `server/database/license_schema.sql`

License tables:

- `licenses`
- `feature_usage_log`

CSV fallback uses:

- `users.csv`
- `projects.csv`
- `sequences.csv`
- Per-project bug files named `bugs_<projectKey>.csv`

Important model notes:

- Users have UUID ids, username, bcrypt password, email, role, created timestamp.
- Projects have UUID ids, name, key/project_key, description, client, status, created_by, members.
- Bugs have numeric internal id plus composite `bug_id` like `SM-0001`.
- Bugs include title, description, client, module, environment, severity, priority, status, reporter, assignee, qa owner/status, target fix version, SLA date, attachment links, closure reason, ARB, bug type, activity, and attachments.
- MySQL project GitHub fields are stored in project `Temp1` and `Temp2`.
- MySQL bug attachments are stored in the `attachments` column.

## Authentication And Authorization

Auth is JWT Bearer token based:

- `server/middleware/auth.js` reads `Authorization: Bearer <token>`
- `client/src/App.js` stores token in `localStorage`
- Axios request interceptor adds the token to every request
- `GET /api/auth/me` restores the user on app load

Roles:

- `godmode` and `admin` have elevated privileges
- `user` is regular access

Frontend admin-only routing is handled by `ProtectedRoute adminOnly` in `client/src/App.js`.

Backend route-level admin/elevated checks are implemented inline in route modules. Inspect each route before changing authorization behavior.

## License And Feature Gating

Feature definitions:

- `server/config/features.js`

Tier names:

- `community`
- `professional`
- `enterprise`
- `cloud`

Community default limits:

- 5 users
- 3 projects
- 5 MB max attachment size
- 0 AI requests per month

Server-side license flow:

- `server/services/licenseService.js` defaults to Community if CSV mode is active, license tables are missing, or license status cannot be loaded.
- `server/middleware/licenseValidator.js` attaches `req.license`, exposes `requireFeature(featureName)`, and `checkLimit(limitType)`.
- `server/routes/analytics.js` gates advanced reporting and AI commentary through feature checks.
- `server/routes/auth.js` uses `checkLimit("users")` before registration.
- `server/routes/projects.js` uses `checkLimit("projects")` before project creation.

Client-side license flow:

- `client/src/contexts/LicenseContext.js` fetches `/api/license/status` every 5 minutes.
- `client/src/hooks/useLicense.js` exposes license context.
- `client/src/hooks/useFeature.js` checks feature availability.
- `client/src/components/common/FeatureGuard.js` conditionally renders licensed UI.
- `client/src/components/common/UpgradePrompt.js` renders upgrade prompts.
- `client/src/components/common/LicenseStatus.js` displays license state.

## Attachments

Attachment API:

- `server/routes/attachments.js`

Attachment storage:

- Uses `hybrid-storage/` package when available
- Supports local storage by default under `uploads/`
- Supports Azure Blob through environment variables
- `hybrid-storage/src/` also includes S3 and SharePoint providers

Notable implementation detail:

- `server/routes/attachments.js` performs direct MySQL reads/updates for bug attachment metadata instead of going through the main storage abstraction. Be careful when changing CSV support or storage consistency here.

Hybrid storage files:

- `hybrid-storage/src/index.js`
- `hybrid-storage/src/core/StorageManager.js`
- `hybrid-storage/src/core/BaseProvider.js`
- `hybrid-storage/src/providers/LocalProvider.js`
- `hybrid-storage/src/providers/AzureBlobProvider.js`
- `hybrid-storage/src/providers/S3Provider.js`
- `hybrid-storage/src/providers/SharePointProvider.js`

## Frontend Architecture

Client entry:

- `client/src/index.js`
- `client/src/App.js`

Global concerns:

- Auth context is defined in `client/src/App.js`
- License context is defined in `client/src/contexts/LicenseContext.js`
- Axios auth interceptor is in `client/src/App.js`
- Axios base URL is also set in `client/src/App.js`
- Common license UI is in `client/src/components/common/`

Major components:

- `Dashboard.js` - regular user dashboard
- `AdminDashboard.js` - elevated user dashboard
- `ProjectList.js` - project listing and stats loading
- `ProjectDetail.js` - project detail and project bug stats
- `ProjectForm.js` - create/edit project
- `BugList.js` - all/project/my bug list modes
- `BugDetail.js` - bug details, status updates, comments, delete
- `BugForm.js` - create/edit bug, comments, attachments
- `UserManagement.js` - create/delete users, project membership, password reset, role changes
- `ChangePassword.js` - current user password changes
- `ReportGenerator.js` - analytics report and AI commentary UI
- `EmailConfig.js` - SMTP config, schedules, logs
- `Navbar.js` - primary navigation and role display
- `HelpModal.js` and `HelpManual.js` - help content

## Common Edit Starting Points

For route/API behavior:

- Start at `server/index.js` for route mounting
- Then inspect the relevant file in `server/routes/`
- Then inspect storage calls in `server/storage/index.js`, `server/storage/mysql/index.js`, and `server/storage/csv/index.js`

For frontend navigation or protected pages:

- Start at `client/src/App.js`
- Then inspect `client/src/components/Navbar.js`
- Then inspect the target component under `client/src/components/`

For auth:

- Client: `client/src/App.js`, `client/src/components/Login.js`
- Server: `server/routes/auth.js`, `server/middleware/auth.js`
- Storage: user methods in both storage implementations

For roles/permissions:

- Client: `ProtectedRoute` and `hasElevatedPrivileges` in `client/src/App.js`
- Navbar visibility: `client/src/components/Navbar.js`
- Server: route modules, especially `auth.js`, `projects.js`, `bugs.js`, `analytics.js`

For bug fields/workflow:

- Client: `client/src/components/BugForm.js`, `BugDetail.js`, `BugList.js`
- Server: `server/routes/bugs.js`
- Storage: bug methods in both storage implementations
- Schema: `server/database/mantis.sql`

For project fields/members/GitHub repo config:

- Client: `ProjectForm.js`, `ProjectDetail.js`, `ProjectList.js`, `UserManagement.js`
- Server: `server/routes/projects.js`
- Storage: project methods in both storage implementations
- Schema: `projects` and `project_members` in `server/database/mantis.sql`

For dashboards/reports:

- Client: `Dashboard.js`, `AdminDashboard.js`, `ReportGenerator.js`
- Server: `server/routes/analytics.js`
- Storage: analytics methods in both storage implementations
- License gates: `FEATURES.ADVANCED_REPORTING`, `FEATURES.AI_INSIGHTS`

For email reports:

- Client: `client/src/components/EmailConfig.js`
- Server: `server/routes/email.js`, `server/services/emailService.js`
- Schema: `email_config`, `scheduled_reports`, `report_recipients`, `email_log`

For license work:

- Server config: `server/config/features.js`, `server/config/license.config.js`
- Server services: `server/services/licenseService.js`, `server/services/featureService.js`
- Server middleware/routes: `server/middleware/licenseValidator.js`, `server/routes/license.js`
- Client context/UI: `LicenseContext.js`, `useLicense.js`, `useFeature.js`, `FeatureGuard.js`, `LicenseStatus.js`, `UpgradePrompt.js`
- Schema: `server/database/license_schema.sql`

For attachments:

- Client: `FileUpload.js`, `AttachmentList.js`, `BugForm.js`, `BugDetail.js`
- Server: `server/routes/attachments.js`
- Storage package: `hybrid-storage/src/`
- Schema: `bugs.attachments`

## Environment Variables

Core:

- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

License:

- `LICENSE_VALIDATION_URL`
- `ENABLE_ONLINE_VALIDATION`
- `ENABLE_FEATURE_TRACKING`

Attachments:

- `DEFAULT_STORAGE`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER`
- `AZURE_STORAGE_FOLDER`
- `AZURE_BLOB_ENDPOINT`
- `AZURE_SAS_TOKEN`
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_KEY`

AI/reporting:

- `OPENAI_API_KEY`

## Gotchas

- Data model changes must update both MySQL and CSV storage implementations.
- The root `db:init` script uses `server/database/mantis.sql`.
- `server/routes/attachments.js` bypasses the storage abstraction for some MySQL operations.
- GitHub project config uses `Temp1` and `Temp2` fields in MySQL projects.
- License service intentionally fails open/defaults to Community for availability.
- Client app is deployed under `/mantis`; route and asset paths should respect that.
- `featureService.min.js` and `licenseService.min.js`, if present, are minified and should not be modified.
