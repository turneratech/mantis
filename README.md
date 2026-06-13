<p align="center">
  <img src="./imgs/logo_mid.png" alt="Mantis Logo" width="120" height="120">
</p>

<h1 align="center">Mantis</h1>

<p align="center">
  <strong>Mantis — A Modern, Multi-Project Bug Tracking Platform with Dual Storage Architecture</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/react-18.x-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/mysql-8.x-orange.svg" alt="MySQL">
</p>

---

## 📋 Overview

**Mantis** is a full-featured, enterprise-ready bug tracking system designed for software development teams. Built with a modern tech stack, it offers a clean dark-themed UI, multi-project support, role-based access control, and a flexible dual-storage architecture that automatically detects and uses either MySQL or CSV backends.

<p align="center">
  <img src="/imgs/dashboard_img.png" alt="Dashboard Screenshot" width="800">
</p>

---

## ✨ Features

### Core Capabilities
| Feature | Description |
|---------|-------------|
| 🐛 **Multi-Project Management** | Organize bugs across projects with unique identifiers (PROJECT-0001) |
| 👥 **Team Collaboration** | Assign bugs, add comments, track activity logs |
| 📊 **Analytics Dashboards** | Real-time statistics for admins and users |
| 🔐 **Role-Based Access** | Admin and User roles with different permissions |
| 🎨 **Modern Dark UI** | Clean, responsive interface built with React |

### Bug Tracking
| Feature | Description |
|---------|-------------|
| 📝 **20+ Bug Fields** | Comprehensive bug information capture |
| 🏷️ **Priority & Severity** | Critical, High, Medium, Low classifications |
| 📈 **Status Workflow** | Open → In Progress → Resolved → Closed → Reopened |
| 👤 **ARB Field** | Multi-select "Action Required By" for team accountability |
| 💬 **Activity Log** | Complete audit trail of all changes and comments |
| 🔗 **Attachment Links** | Reference external documents and screenshots |

### Administration
| Feature | Description |
|---------|-------------|
| 🏢 **Project Management** | Create, edit, and manage multiple projects |
| 👥 **User Management** | Add/remove users, assign roles |
| 🔑 **Password Management** | Secure password change functionality |

### Technical Highlights
| Feature | Description |
|---------|-------------|
| 🔄 **Dual Storage** | Auto-detection of MySQL or CSV backend |
| 🚀 **Zero-Config Mode** | Works out of the box without database setup |
| 🔒 **JWT Authentication** | Secure token-based authentication |
| 📱 **Responsive Design** | Works on desktop, tablet, and mobile |

---

## 🏗️ Architecture

### Dual Storage System

Mantis features a unique storage abstraction layer that automatically detects and uses the best available backend:

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

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 | UI Framework |
| | React Router 6 | Client-side routing |
| | Axios | HTTP client |
| | CSS3 | Custom dark theme |
| **Backend** | Node.js | Runtime environment |
| | Express.js | Web framework |
| | MySQL 8 | Primary database |
| | CSV | Fallback storage |
| | JWT | Authentication |
| | bcrypt | Password hashing |
| **DevOps** | PM2 | Process management |
| | Nginx | Reverse proxy |
| | AWS EC2 | Cloud hosting |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- MySQL 8.x (optional - CSV mode available)

### Option 1: CSV Mode (Zero Dependencies)

```bash
# Clone and install
git clone https://github.com/turneratech/mantis.git
cd mantis
npm run install-all

# Start (auto-uses CSV storage)
npm run dev
```

### Option 2: MySQL Mode (Recommended for Production)

```bash
# 1. Clone repository
git clone https://github.com/turneratech/mantis.git
cd mantis

# 2. Setup MySQL database
mysql -u root -p -e "CREATE DATABASE mantis;"
mysql -u root -p -e "CREATE USER 'mantis'@'localhost' IDENTIFIED BY 'your-password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON mantis.* TO 'mantis'@'localhost';"
mysql -u mantis -p mantis < server/database/mantis.sql

# 3. Configure environment
cp .env.example .env
nano .env  # Add your MySQL credentials

# 4. Install and start
npm run install-all
npm run dev
```

### Access the Application

```
URL: http://localhost:3000
Username: admin
Password: admin123
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this

# MySQL Configuration (optional - will use CSV if not configured)
DB_HOST=localhost
DB_PORT=3306
DB_USER=mantis
DB_PASSWORD=your-password
DB_NAME=mantis

# Application Settings
DEFAULT_ADMIN_PASSWORD=admin123
```

### Storage Modes

| Mode | When to Use | Setup Required |
|------|-------------|----------------|
| **CSV** | Development, small teams, quick demos | None |
| **MySQL** | Production, larger teams, data integrity | Database setup |

### Switching Storage Backends

**To MySQL:** Configure `DB_*` variables in `.env` and restart

**To CSV:** Remove or comment out `DB_*` variables and restart

---

## 📁 Project Structure

```
mantis/
├── client/                     # React Frontend
│   ├── public/
│   │   └── imgs/              # Static images
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── AdminDashboard.js
│   │   │   ├── BugDetail.js
│   │   │   ├── BugForm.js
│   │   │   ├── BugList.js
│   │   │   ├── ChangePassword.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Footer.js
│   │   │   ├── Login.js
│   │   │   ├── MultiSelect.js
│   │   │   ├── Navbar.js
│   │   │   ├── ProjectDetail.js
│   │   │   ├── ProjectForm.js
│   │   │   ├── ProjectList.js
│   │   │   └── UserManagement.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── styles.css
│   └── package.json
│
├── server/                     # Node.js Backend
│   ├── database/
│   │   └── mantis.sql         # MySQL schema
│   ├── data/                  # CSV storage (auto-created)
│   │   ├── users.csv
│   │   ├── projects.csv
│   │   ├── sequences.csv
│   │   └── bugs_*.csv         # Per-project bug files
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bugs.js
│   │   ├── projects.js
│   │   └── analytics.js
│   ├── storage/               # ★ Storage Abstraction Layer
│   │   ├── index.js           # Factory - auto-detects backend
│   │   ├── interface.js       # Interface documentation
│   │   ├── mysql/
│   │   │   ├── index.js
│   │   │   └── db.js
│   │   └── csv/
│   │       ├── index.js
│   │       └── csvHandler.js
│   └── index.js
│
├── docs/                       # Documentation & images
├── .env.example
├── package.json
└── README.md
```

---

## 📖 API Reference

### Health Check

```bash
GET /api/health

# Response
{
  "status": "ok",
  "storage": { "type": "mysql", "connected": true },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Auth |
| GET | `/api/auth/users` | List all users | Auth |
| POST | `/api/auth/register` | Create new user | Admin |
| DELETE | `/api/auth/users/:id` | Delete user | Admin |
| PUT | `/api/auth/change-password` | Change password | Auth |

### Projects

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/projects` | List all projects | Auth |
| GET | `/api/projects/:id` | Get project details | Auth |
| POST | `/api/projects` | Create project | Admin |
| PUT | `/api/projects/:id` | Update project | Admin |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add team member | Admin |
| DELETE | `/api/projects/:id/members/:username` | Remove member | Admin |

### Bugs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/bugs/all` | List all bugs | Auth |
| GET | `/api/bugs/project/:projectKey` | List bugs by project | Auth |
| GET | `/api/bugs/my-bugs` | List user's assigned bugs | Auth |
| GET | `/api/bugs/:projectKey/:bugId` | Get bug details | Auth |
| POST | `/api/bugs/:projectKey` | Create new bug | Auth |
| PUT | `/api/bugs/:projectKey/:bugId` | Update bug | Auth |
| DELETE | `/api/bugs/:projectKey/:bugId` | Delete bug | Auth |
| POST | `/api/bugs/:projectKey/:bugId/comment` | Add comment | Auth |

### Analytics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/analytics/overview` | Admin dashboard stats | Admin |
| GET | `/api/analytics/user-dashboard` | User dashboard stats | Auth |

### Example Requests

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Create Bug
curl -X POST http://localhost:5000/api/bugs/SM \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Login button not working",
    "description": "Users cannot click the login button on mobile",
    "severity": "High",
    "priority": "High",
    "assignee": "john",
    "arb": ["john", "jane"]
  }'
```

---

## 🗄️ Database Schema

```sql
-- Users
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE projects (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  `key` VARCHAR(10) UNIQUE NOT NULL,
  description TEXT,
  client VARCHAR(100),
  status ENUM('Active', 'On Hold', 'Completed') DEFAULT 'Active',
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bugs
CREATE TABLE bugs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bug_id VARCHAR(20) UNIQUE NOT NULL,
  project_id VARCHAR(36),
  project_key VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client VARCHAR(100),
  module VARCHAR(100),
  environment VARCHAR(50),
  severity ENUM('Critical', 'High', 'Medium', 'Low'),
  priority ENUM('Critical', 'High', 'Medium', 'Low'),
  status VARCHAR(20) DEFAULT 'Open',
  reporter VARCHAR(50),
  assignee VARCHAR(50),
  qa_owner VARCHAR(50),
  qa_status VARCHAR(20),
  target_fix_version VARCHAR(50),
  due_sla DATE,
  attachment_links TEXT,
  closure_reason VARCHAR(50),
  arb VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL
);
```

---

## 🔌 Storage Interface

Both MySQL and CSV implementations follow this unified interface:

```javascript
// Users
storage.getUserById(id)
storage.getUserByUsername(username)
storage.getAllUsers()
storage.createUser(userData)
storage.deleteUser(id)
storage.updateUserPassword(id, hashedPassword)

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

// Analytics
storage.getAdminAnalytics()
storage.getUserDashboard(username, isAdmin)

// System
storage.getStorageType()  // Returns 'mysql' or 'csv'
storage.isConnected()
```

### Extending Storage

To add a new backend (PostgreSQL, MongoDB, etc.):

1. Create folder: `server/storage/postgres/`
2. Implement all methods from `interface.js`
3. Update `server/storage/index.js` detection logic

---

## 🚢 Deployment

Mantis is a **self-hosted, licensable** product. Configure your own database (MySQL, Supabase/PostgreSQL, CSV demo), file storage (S3, Azure, SharePoint, Supabase Storage), and outbound webhooks to sync with external systems.

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full guide and **Admin → Deployment** in the UI for connection testing.

```bash
cp .env.example .env   # configure providers
cd hybrid-storage && npm install && cd ..
npm run dev
```

### AWS EC2 Deployment

#### 1. Launch EC2 Instance
- Amazon Linux 2023 or Ubuntu 22.04
- t2.micro or larger
- Security Group: Open ports 22, 80, 443

#### 2. Install Dependencies

```bash
# Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # Amazon Linux
# sudo apt install -y nodejs  # Ubuntu

# MySQL (optional)
sudo yum install -y mysql-server
sudo systemctl start mysqld

# Nginx & PM2
sudo yum install -y nginx
sudo npm install -g pm2
```

#### 3. Deploy Application

```bash
# Clone and setup
cd /var/www
git clone https://github.com/turneratech/mantis.git
cd mantis

npm run install-all
cp .env.example .env
nano .env  # Configure settings

# Build frontend
cd client && npm run build && cd ..

# Start with PM2
pm2 start server/index.js --name mantis
pm2 save && pm2 startup
```

#### 4. Configure Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/mantis/client/build;
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

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DB_HOST=db
      - DB_USER=mantis
      - DB_PASSWORD=password
      - DB_NAME=mantis
    depends_on:
      - db
  
  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=mantis
      - MYSQL_USER=mantis
      - MYSQL_PASSWORD=password
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

## 🔒 Security

### Built-in Protection
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **SQL Injection**: Parameterized queries
- **XSS Protection**: React's built-in escaping
- **Input Validation**: Server-side validation on all inputs

### Production Recommendations

| Priority | Action |
|----------|--------|
| ⚠️ Critical | Change default admin password immediately |
| 🔑 High | Use strong, unique `JWT_SECRET` |
| 🔐 High | Enable HTTPS with SSL certificate |
| 📦 Medium | Regularly update dependencies |
| 🚦 Medium | Implement rate limiting |

---

## 📦 Default Projects

| Key | Name | Description |
|-----|------|-------------|
| SM | SandMaster | AI-driven sand management |
| RM | RockMaster | ML-based well log prediction |
| GRN | Green Platform | GHG emissions platform |
| FV | FieldViz | AI-OCR document digitization |
| BH | BugHive | Internal bug tracking |

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Guidelines
- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI Framework
- [Express](https://expressjs.com/) - Backend Framework
- [MySQL](https://www.mysql.com/) - Database
- All contributors who have helped improve this project

---

## 📧 Support

- **Documentation**: [Wiki](https://github.com/turneratech/mantis/wiki)
- **Issues**: [GitHub Issues](https://github.com/turneratech/mantis/issues)
- **Email**: support@turneratech.com

---

<p align="center">
  Made with ❤️ by <a href="https://turneratech.com">TurneraTech</a>
</p>

<p align="center">
  <a href="https://turneratech.com">Website</a> •
  <a href="https://twitter.com/turneratech">Twitter</a> •
  <a href="https://linkedin.com/company/turneratech">LinkedIn</a>
</p>
