# Mantis Site Map

**Last updated:** 2026-06-13  
**Companion:** `docs/PROJECT_CACHE.md` (architecture + TurnerTech production state)

Use this file as a compact map of client pages and server APIs. The app is mounted under `/mantis` in the browser, while APIs are called under `/api/*` through the configured base/proxy path.

## Browser Routes

Defined in `client/src/App.js`.

Base path:

- `/mantis`

**First-run setup** (when `needsSetup` — replaces all routes):

- `/*` → `SetupWizard` (unauthenticated): admin bootstrap, DB, storage, license, complete

Public route (after setup):

- `/login` - login page, renders `Login`; redirects authenticated users to `/`

Protected routes:

- `/` - dashboard; renders `AdminDashboard` for `godmode`/`admin`, otherwise `Dashboard`
- `/projects` - project list, renders `ProjectList`
- `/projects/new` - create project, admin/godmode only, renders `ProjectForm`
- `/projects/:projectId` - project detail, renders `ProjectDetail`
- `/projects/:projectId/edit` - edit project, admin/godmode only, renders `ProjectForm`
- `/projects/:projectKey/bugs` - bug list for one project, renders `BugList`
- `/projects/:projectKey/bugs/new` - create bug in project, renders `BugForm`
- `/projects/:projectKey/bugs/:bugId` - bug detail, renders `BugDetail`
- `/projects/:projectKey/bugs/:bugId/edit` - edit bug, renders `BugForm`
- `/my-bugs` - current user's bugs, renders `BugList` with `showMyBugs`
- `/users` - user management, admin/godmode only, renders `UserManagement`
- `/change-password` - change current user's password, renders `ChangePassword`
- `/reports` - report generator, admin/godmode only, renders `ReportGenerator`
- `/email-config` - email configuration, admin/godmode only, renders `EmailConfig`
- `/deployment` - deployment/storage config, admin/godmode only, renders `DeploymentConfig`

Persistent layout:

- `Navbar` renders only when authenticated
- `Footer` renders only when authenticated
- `UpgradePrompt` is mounted globally inside `LicenseProvider`
- `LicenseProvider` wraps the router

## Navbar Links

Defined in `client/src/components/Navbar.js`.

All authenticated users:

- Dashboard -> `/`
- Projects -> `/projects`
- My Bugs -> `/my-bugs`
- Help button -> opens `HelpModal`
- Change Password button -> `/change-password`
- Logout button -> clears local auth state

Admin/godmode only:

- Users -> `/users`
- Email Config -> `/email-config`
- Reports -> `/reports`
- Report shortcut button -> `/reports`

## Client API Usage By Page

`App.js`:

- `GET /api/auth/me`
- `POST /api/auth/login`

`Dashboard.js`:

- `GET /api/analytics/user-dashboard`

`AdminDashboard.js`:

- `GET /api/analytics/overview`

`ProjectList.js`:

- `GET /api/projects`
- `GET /api/bugs/stats/:projectKey`

`ProjectDetail.js`:

- `GET /api/projects/:projectId`
- `GET /api/bugs/stats/:projectKey`
- `DELETE /api/projects/:projectId`

`ProjectForm.js`:

- `GET /api/auth/users`
- `GET /api/projects/:projectId`
- `POST /api/projects`
- `PUT /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

`BugList.js`:

- `GET /api/projects`
- `GET /api/bugs/my-bugs`
- `GET /api/bugs/project/:projectKey`
- `GET /api/bugs/all`

`BugDetail.js`:

- `GET /api/bugs/:projectKey/:bugId`
- `PUT /api/bugs/:projectKey/:bugId`
- `POST /api/bugs/:projectKey/:bugId/comment`
- `DELETE /api/bugs/:projectKey/:bugId/comment/:commentId`
- `DELETE /api/bugs/:projectKey/:bugId`

`BugForm.js`:

- `GET /api/auth/users`
- `GET /api/projects`
- `GET /api/bugs/:projectKey/:bugId`
- `GET /api/attachments/:bugId`
- `POST /api/bugs/:projectKey`
- `PUT /api/bugs/:projectKey/:bugId`
- `POST /api/bugs/:projectKey/:bugId/comment`
- `DELETE /api/bugs/:projectKey/:bugId/comment/:commentId`
- `DELETE /api/bugs/:projectKey/:bugId`

`FileUpload.js`:

- `GET /api/attachments/providers`
- `POST /api/attachments/:bugId`

`AttachmentList.js`:

- `GET /api/attachments/download/:provider/*`
- `GET /api/attachments/stream/:provider/*`
- `DELETE /api/attachments/:bugId/:attachmentId`

`UserManagement.js`:

- `GET /api/auth/users`
- `GET /api/projects`
- `POST /api/auth/register`
- `DELETE /api/auth/users/:userId`
- `POST /api/projects/:projectId/members`
- `DELETE /api/projects/:projectId/members/:username`
- `PUT /api/auth/users/:userId/reset-password`
- `PUT /api/auth/users/:userId/role`

`ChangePassword.js`:

- `PUT /api/auth/change-password`

`ReportGenerator.js`:

- `GET /api/projects`
- `POST /api/analytics/report-data`
- `POST /api/analytics/generate-report`
- `POST /api/analytics/ai-commentary`

`EmailConfig.js`:

- `GET /api/email/status`
- `GET /api/email/config`
- `GET /api/email/schedules`
- `GET /api/projects`
- `GET /api/email/log?limit=20&offset=:offset`
- `POST /api/email/config`
- `POST /api/email/config/test`
- `POST /api/email/config/send-test`
- `DELETE /api/email/config/:id`
- `POST /api/email/schedules`
- `PATCH /api/email/schedules/:id/toggle`
- `DELETE /api/email/schedules/:id`
- `POST /api/email/schedules/:id/send-now`

`SetupWizard.js` (first-run):

- `GET /api/setup/status`
- `GET /api/setup/providers`
- `POST /api/setup/bootstrap-admin`
- `POST /api/setup/settings`
- `POST /api/setup/test/database`
- `POST /api/setup/test/storage`
- `POST /api/setup/complete`
- `POST {PORTAL_URL}/api/licenses/fetch` (external portal)

`LicenseContext.js`:

- `GET /api/license/status`
- `POST /api/license/activate`

## Backend API Map

All route modules are mounted in `server/index.js`.

### Setup (public until complete)

Mounted from `server/routes/setup.js` at `/api/setup`.

- `GET /api/setup/status` - needsSetup, instance id, providers
- `GET /api/setup/providers` - DB/storage options
- `POST /api/setup/bootstrap-admin` - create first admin (no login required)
- `POST /api/setup/settings` - save deployment settings
- `POST /api/setup/test/database` - test DB connection
- `POST /api/setup/test/storage` - test file storage
- `POST /api/setup/complete` - mark setup done

### Health

- `GET /api/health` - service health and active storage backend

### Auth

Mounted from `server/routes/auth.js` at `/api/auth`.

- `POST /api/auth/login` - public login
- `GET /api/auth/me` - current authenticated user
- `GET /api/auth/users` - list users
- `POST /api/auth/register` - create user, limited by license
- `DELETE /api/auth/users/:id` - delete user
- `PUT /api/auth/change-password` - change current user's password
- `PUT /api/auth/users/:id/reset-password` - reset another user's password
- `PUT /api/auth/users/:id/role` - update user role

### Projects

Mounted from `server/routes/projects.js` at `/api/projects`.

- `GET /api/projects` - list projects visible to current user
- `GET /api/projects/:id` - get project details
- `POST /api/projects` - create project, limited by license
- `PUT /api/projects/:id` - update project
- `DELETE /api/projects/:id` - delete project
- `POST /api/projects/:id/members` - add project member
- `DELETE /api/projects/:id/members/:username` - remove project member

### Bugs

Mounted from `server/routes/bugs.js` at `/api/bugs`.

- `GET /api/bugs/all` - list all visible bugs
- `GET /api/bugs/project/:projectKey` - list bugs in one project
- `GET /api/bugs/my-bugs` - list current user's bugs
- `GET /api/bugs/:projectKey/:bugId` - get bug details
- `POST /api/bugs/:projectKey` - create bug in project
- `PUT /api/bugs/:projectKey/:bugId` - update bug
- `POST /api/bugs/:projectKey/:bugId/comment` - add comment
- `DELETE /api/bugs/:projectKey/:bugId` - delete bug
- `DELETE /api/bugs/:projectKey/:bugId/comment/:commentId` - delete comment
- `GET /api/bugs/stats/:projectKey` - project bug stats

Route ordering note:

- `GET /stats/:projectKey` appears after dynamic `/:projectKey/:bugId` routes in `server/routes/bugs.js`; current path shape still avoids conflict because it has two path segments.

### Analytics

Mounted from `server/routes/analytics.js` at `/api/analytics`.

- `GET /api/analytics/overview` - elevated dashboard overview
- `GET /api/analytics/user-dashboard` - current user's dashboard
- `POST /api/analytics/report-data` - report data
- `POST /api/analytics/generate-report` - generate PDF report, requires advanced reporting feature
- `POST /api/analytics/ai-commentary` - AI commentary, requires AI insights feature

### Attachments

Mounted from `server/routes/attachments.js` at `/api/attachments`.

- `GET /api/attachments/providers` - available storage providers
- `POST /api/attachments/:bugId` - upload attachment
- `GET /api/attachments/:bugId` - list bug attachments
- `GET /api/attachments/download/:provider/*` - download attachment
- `GET /api/attachments/stream/:provider/*` - stream attachment
- `DELETE /api/attachments/:bugId/:attachmentId` - delete attachment

### Email

Mounted from `server/routes/email.js` at `/api/email`.

- `GET /api/email/config` - SMTP config
- `PATCH /api/email/config/logo` - update logo
- `POST /api/email/config` - save SMTP config
- `POST /api/email/config/test` - test SMTP settings
- `POST /api/email/config/send-test` - send test email
- `DELETE /api/email/config/:id` - delete SMTP config
- `GET /api/email/schedules` - list scheduled reports
- `GET /api/email/schedules/:id` - get scheduled report
- `POST /api/email/schedules` - create scheduled report
- `DELETE /api/email/schedules/:id` - delete scheduled report
- `PATCH /api/email/schedules/:id/toggle` - enable/disable schedule
- `POST /api/email/schedules/:id/send-now` - send schedule immediately
- `POST /api/email/schedules/:id/recipients` - add schedule recipient
- `DELETE /api/email/recipients/:id` - delete recipient
- `GET /api/email/log` - email send log
- `GET /api/email/status` - email service status
- `POST /api/email/initialize` - initialize email service

### License

Mounted from `server/routes/license.js` at `/api/license`.

- `GET /api/license/status` - public license status
- `POST /api/license/activate` - activate license, admin only
- `POST /api/license/validate` - validate license key, admin only
- `GET /api/license/limits` - current license limits
- `DELETE /api/license/deactivate` - deactivate license, admin only

### GitHub Webhooks

Mounted from `server/routes/github-webhook.js` at `/api/webhooks`.

- `POST /api/webhooks/github` - GitHub webhook receiver, raw JSON body
- `GET /api/webhooks/github/test/:projectKey` - test webhook/project mapping
- `GET /api/webhooks/github/health` - webhook health

## Portal API (separate app — `portal/server.js`, not main server)

Base URL prod: `https://license.turneratech.com` | dev: `http://localhost:4000`

- `GET /api/config` - public config for WordPress page
- `GET /api/public-key` - ES256 public key for license validation
- `POST /api/register` - create portal account (WordPress form)
- `POST /api/login` - portal login
- `GET /api/me` - current portal user (Bearer)
- `GET /api/licenses/mine` - user's licenses (Bearer)
- `POST /api/licenses/issue` - issue Community license (Bearer)
- `POST /api/licenses/fetch` - fetch license by email+password (setup wizard)
- `POST /api/licenses/validate` - validate JWT license key

## Access Map

Public:

- Browser `/login`
- **Entire app → SetupWizard** when `needsSetup`
- `GET /api/setup/status` and other `/api/setup/*` until complete
- `POST /api/auth/login`
- `GET /api/license/status`
- `POST /api/webhooks/github`
- `GET /api/webhooks/github/test/:projectKey`
- `GET /api/webhooks/github/health`
- `GET /api/health`

Authenticated:

- Most project, bug, dashboard, attachment, email, user listing, and password endpoints
- Most protected browser routes

Admin/godmode frontend routes:

- `/projects/new`
- `/projects/:projectId/edit`
- `/users`
- `/reports`
- `/email-config`

License-gated backend behaviors:

- User creation checks `users` limit
- Project creation checks `projects` limit
- PDF report generation requires `advanced_reporting`
- AI commentary requires `ai_insights`

## Page To File Map

- Login: `client/src/components/Login.js`
- Dashboard: `client/src/components/Dashboard.js`
- Admin dashboard: `client/src/components/AdminDashboard.js`
- Projects: `client/src/components/ProjectList.js`
- Project detail: `client/src/components/ProjectDetail.js`
- Project create/edit: `client/src/components/ProjectForm.js`
- Bugs list: `client/src/components/BugList.js`
- Bug detail: `client/src/components/BugDetail.js`
- Bug create/edit: `client/src/components/BugForm.js`
- User management: `client/src/components/UserManagement.js`
- Change password: `client/src/components/ChangePassword.js`
- Reports: `client/src/components/ReportGenerator.js`
- Email config: `client/src/components/EmailConfig.js`
- Attachments upload: `client/src/components/FileUpload.js`
- Attachments list: `client/src/components/AttachmentList.js`
- Global navigation: `client/src/components/Navbar.js`
- Help modal/manual: `client/src/components/HelpModal.js`, `client/src/components/HelpManual.js`
- License provider: `client/src/contexts/LicenseContext.js`
- License guards/status: `client/src/components/common/FeatureGuard.js`, `LicenseStatus.js`, `UpgradePrompt.js`
- Setup wizard: `client/src/components/SetupWizard.js`
- Deployment admin: `client/src/components/DeploymentConfig.js` (if present)
- Portal config (client): `client/src/config/portal.js`
