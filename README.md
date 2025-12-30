# BugTracker - Multi-Project Bug Tracking System

A self-hosted bug tracking system with **automatic storage backend detection**. Supports both MySQL and CSV storage, automatically falling back to CSV if MySQL is unavailable.

## Key Features

### Dual Storage Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (Routes: auth, bugs, projects, analytics)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Storage Abstraction Layer                  │
│  (server/storage/index.js - Factory & Interface)            │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│     MySQL Storage       │     │      CSV Storage        │
│  (server/storage/mysql) │     │   (server/storage/csv)  │
│                         │     │                         │
│  • Connection pooling   │     │  • File-based storage   │
│  • Transactions         │     │  • No dependencies      │
│  • Optimized queries    │     │  • Portable data        │
│  • Row-level locking    │     │  • Easy backup          │
└─────────────────────────┘     └─────────────────────────┘
```

### Auto-Detection Flow
1. On startup, the system attempts to connect to MySQL
2. If MySQL is available AND tables exist → Uses MySQL
3. Otherwise → Falls back to CSV storage
4. Application code is **completely agnostic** to storage backend

### Multi-Project Support
- Each project has its own namespace
- Bug IDs prefixed with project key (SM-0001, RM-0001)
- Team member assignment per project

### Analytics Dashboards
- **Admin Dashboard**: Bug trends, distributions, per-user stats
- **User Dashboard**: Personal bugs, projects, recent activity

---

## Quick Start

### Option 1: CSV Mode (Zero Dependencies)

```bash
# Extract and install
unzip bug-tracker.zip
cd bug-tracker
npm run install-all

# Start (will auto-use CSV storage)
npm run dev
```

Access at: http://localhost:3000
Login: `admin` / `admin123`

### Option 2: MySQL Mode (Production Recommended)

```bash
# 1. Setup MySQL database
mysql -u root -p < server/database/schema.sql

# 2. Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# 3. Install and start
npm run install-all
npm run dev
```

---

## Configuration

### Environment Variables (.env)

```env
# Server
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-here

# MySQL (optional - will fall back to CSV if unavailable)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bugtracker
```

---

## Project Structure

```
bug-tracker/
├── package.json              # Dependencies (mysql2 + csv-writer)
├── .env.example              # Environment template
│
├── server/
│   ├── index.js              # Express server with storage init
│   │
│   ├── storage/              # ★ Storage Abstraction Layer
│   │   ├── index.js          # Factory - auto-detects backend
│   │   ├── interface.js      # Interface documentation
│   │   │
│   │   ├── mysql/            # MySQL Implementation
│   │   │   ├── index.js      # All storage methods
│   │   │   └── db.js         # Connection pool
│   │   │
│   │   └── csv/              # CSV Implementation
│   │       ├── index.js      # All storage methods
│   │       └── csvHandler.js # File I/O utilities
│   │
│   ├── database/
│   │   └── schema.sql        # MySQL schema with indexes
│   │
│   ├── routes/               # API routes (storage-agnostic)
│   │   ├── auth.js
│   │   ├── bugs.js
│   │   ├── projects.js
│   │   └── analytics.js
│   │
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   │
│   └── data/                 # CSV files (auto-created)
│       ├── users.csv
│       ├── projects.csv
│       ├── sequences.csv
│       └── bugs_*.csv        # Per-project bug files
│
└── client/                   # React frontend
    ├── src/
    │   ├── components/
    │   │   ├── AdminDashboard.js
    │   │   ├── Dashboard.js
    │   │   ├── BugList.js
    │   │   ├── BugDetail.js
    │   │   ├── BugForm.js
    │   │   ├── ProjectList.js
    │   │   └── ...
    │   ├── App.js
    │   └── styles.css
    └── package.json
```

---

## Storage Interface

Both MySQL and CSV implementations follow the same interface:

```javascript
// Users
storage.getUserById(id)
storage.getUserByUsername(username)
storage.getAllUsers()
storage.createUser(userData)
storage.deleteUser(id)

// Projects
storage.getAllProjects(username, isAdmin)
storage.getProjectById(id)
storage.getProjectByKey(key)
storage.createProject(projectData)
storage.updateProject(id, updates)
storage.deleteProject(id)
storage.addProjectMember(projectId, username)
storage.removeProjectMember(projectId, username)

// Bugs
storage.getAllBugs(limit)
storage.getBugsByProject(projectKey)
storage.getBugsByUser(username)
storage.getBugById(bugId)
storage.generateBugId(projectKey)
storage.createBug(bugData, reporter)
storage.updateBug(bugId, updates, updatedBy)
storage.deleteBug(bugId)
storage.addBugComment(bugId, username, comment)
storage.getBugStats(projectKey)

// Analytics
storage.getAdminAnalytics()
storage.getUserDashboard(username, isAdmin)

// System
storage.getStorageType()  // 'mysql' or 'csv'
storage.isConnected()
storage.initialize()
```

---

## EC2 Deployment

### Prerequisites
- Amazon Linux 2023 or Ubuntu 22.04
- Node.js 18+
- MySQL 8+ (optional, for production)

### Quick Deploy

```bash
# 1. Install dependencies
sudo dnf install -y nodejs mysql80-community-server nginx  # Amazon Linux
# OR
sudo apt install -y nodejs mysql-server nginx  # Ubuntu

# 2. Setup MySQL (optional but recommended)
sudo systemctl start mysqld
mysql -u root -p < server/database/schema.sql

# 3. Deploy application
cd /var/www
unzip bug-tracker.zip
cd bug-tracker
npm run install-all
cp .env.example .env
nano .env  # Configure settings

# 4. Build frontend
cd client && npm run build && cd ..

# 5. Start with PM2
npm install -g pm2
pm2 start server/index.js --name bugtracker
pm2 save && pm2 startup

# 6. Configure Nginx
sudo nano /etc/nginx/conf.d/bugtracker.conf
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/bug-tracker/client/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## API Reference

### Health Check
```
GET /api/health

Response:
{
  "status": "ok",
  "storage": {
    "type": "mysql",  // or "csv"
    "connected": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/users` | List users |
| POST | `/api/auth/register` | Create user (admin) |
| DELETE | `/api/auth/users/:id` | Delete user (admin) |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Get project |
| POST | `/api/projects` | Create (admin) |
| PUT | `/api/projects/:id` | Update (admin) |
| DELETE | `/api/projects/:id` | Delete (admin) |

### Bugs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bugs/all` | All bugs |
| GET | `/api/bugs/project/:key` | Project bugs |
| GET | `/api/bugs/my-bugs` | User's bugs |
| POST | `/api/bugs/:key` | Create bug |
| PUT | `/api/bugs/:key/:id` | Update bug |
| DELETE | `/api/bugs/:key/:id` | Delete bug |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Admin dashboard |
| GET | `/api/analytics/user-dashboard` | User dashboard |

---

## Switching Between Storage Backends

### Current Backend → MySQL

1. Install and configure MySQL
2. Run the schema: `mysql -u root -p < server/database/schema.sql`
3. Update `.env` with MySQL credentials
4. Restart the application

### Current Backend → CSV

1. Remove or rename `.env` (or clear DB_* variables)
2. Restart the application
3. CSV files will be auto-created in `server/data/`

### Migrating Data

Currently, data migration between backends must be done manually. Export from one and import to another using:

```bash
# MySQL to CSV
mysqldump -u root -p --tab=/path/to/export bugtracker

# CSV to MySQL
mysqlimport -u root -p bugtracker /path/to/file.csv
```

---

## Default Projects

| Key | Name | Description |
|-----|------|-------------|
| SM | SandMaster | AI-driven sand management |
| RM | RockMaster | ML-based well log prediction |
| GRN | Green Platform | GHG emissions platform |
| FV | FieldViz | AI-OCR document digitization |
| BH | BugHive | Internal bug tracking |

---

## Extending the Storage Layer

To add a new storage backend (e.g., PostgreSQL, MongoDB):

1. Create new folder: `server/storage/postgres/`
2. Implement all methods from `interface.js`
3. Update `server/storage/index.js` to detect and initialize

```javascript
// Example: Adding PostgreSQL detection
try {
  const pgStorage = require('./postgres');
  if (await pgStorage.testConnection()) {
    storage = pgStorage;
    storageType = 'postgres';
    return storage;
  }
} catch (error) {
  // Fall through to next backend
}
```

---

## License

MIT License - Feel free to use and modify.
