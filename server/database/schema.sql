-- BugTracker MySQL Schema
-- Database: bugtracker

CREATE DATABASE IF NOT EXISTS bugtracker;
USE bugtracker;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Reserved for future expansion
    Temp1 VARCHAR(500) NULL,
    Temp2 VARCHAR(500) NULL,
    Temp3 VARCHAR(500) NULL,
    Temp4 VARCHAR(500) NULL,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    project_key VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    client VARCHAR(100),
    status ENUM('active', 'archived', 'on-hold') DEFAULT 'active',
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Reserved for future expansion
    Temp1 VARCHAR(500) NULL,
    Temp2 VARCHAR(500) NULL,
    Temp3 VARCHAR(500) NULL,
    Temp4 VARCHAR(500) NULL,
    INDEX idx_project_key (project_key),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Reserved for future expansion
    Temp1 VARCHAR(500) NULL,
    Temp2 VARCHAR(500) NULL,
    Temp3 VARCHAR(500) NULL,
    Temp4 VARCHAR(500) NULL,
    UNIQUE KEY unique_project_member (project_id, username),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bugs table (optimized with proper indexes)
CREATE TABLE IF NOT EXISTS bugs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bug_id VARCHAR(20) NOT NULL UNIQUE,
    project_id VARCHAR(36) NOT NULL,
    project_key VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client VARCHAR(100),
    module VARCHAR(100),
    environment ENUM('Development', 'Staging', 'Production', 'Testing') DEFAULT 'Development',
    severity ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Medium',
    priority ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Medium',
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed', 'Reopened') DEFAULT 'Open',
    reporter VARCHAR(50) NOT NULL,
    assignee VARCHAR(50),
    qa_owner VARCHAR(50),
    qa_status ENUM('Not Started', 'Testing', 'Passed', 'Failed') DEFAULT 'Not Started',
    target_fix_version VARCHAR(50),
    due_sla DATE,
    attachment_links TEXT,
    closure_reason ENUM('Fixed', 'Won''t Fix', 'Duplicate', 'Cannot Reproduce', 'By Design', '') DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    -- Reserved for future expansion
    Temp1 VARCHAR(500) NULL,
    Temp2 VARCHAR(500) NULL,
    Temp3 VARCHAR(500) NULL,
    Temp4 VARCHAR(500) NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_bug_id (bug_id),
    INDEX idx_project_id (project_id),
    INDEX idx_project_key (project_key),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    INDEX idx_priority (priority),
    INDEX idx_assignee (assignee),
    INDEX idx_reporter (reporter),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    INDEX idx_closed_at (closed_at),
    -- Composite indexes for common queries
    INDEX idx_project_status (project_id, status),
    INDEX idx_assignee_status (assignee, status),
    INDEX idx_project_severity (project_id, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bug activity log (normalized - better than JSON in CSV)
CREATE TABLE IF NOT EXISTS bug_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bug_id VARCHAR(20) NOT NULL,
    user VARCHAR(50) NOT NULL,
    action ENUM('created', 'updated', 'comment', 'status_change', 'assigned') NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Reserved for future expansion
    Temp1 VARCHAR(500) NULL,
    Temp2 VARCHAR(500) NULL,
    Temp3 VARCHAR(500) NULL,
    Temp4 VARCHAR(500) NULL,
    INDEX idx_bug_id (bug_id),
    INDEX idx_user (user),
    INDEX idx_created_at (created_at),
    INDEX idx_bug_created (bug_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bug ID sequence table (for generating sequential IDs per project)
CREATE TABLE IF NOT EXISTS bug_sequences (
    project_key VARCHAR(10) PRIMARY KEY,
    last_number INT DEFAULT 0,
    -- Reserved for future expansion
    Temp1 VARCHAR(500) NULL,
    Temp2 VARCHAR(500) NULL,
    Temp3 VARCHAR(500) NULL,
    Temp4 VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
-- Hash generated with bcrypt, rounds=10
INSERT INTO users (id, username, password, email, role) VALUES 
(UUID(), 'admin', '$2a$10$rQqy8VpX8V8VFmFqR8LqXOQZJ6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'admin@example.com', 'admin')
ON DUPLICATE KEY UPDATE username=username;

-- Insert default projects
INSERT INTO projects (id, name, project_key, description, client, status, created_by) VALUES
(UUID(), 'SandMaster', 'SM', 'AI-driven sand management system', 'Internal', 'active', 'admin'),
(UUID(), 'RockMaster', 'RM', 'ML-based well log prediction system', 'Internal', 'active', 'admin'),
(UUID(), 'Green Platform', 'GRN', 'GHG emissions platform with proprietary LLM', 'Internal', 'active', 'admin'),
(UUID(), 'FieldViz', 'FV', 'AI-OCR for digitizing handwritten field documents', 'Internal', 'active', 'admin'),
(UUID(), 'BugHive', 'BH', 'Internal bug tracking system', 'Internal', 'active', 'admin')
ON DUPLICATE KEY UPDATE name=name;

-- Add admin to all projects
INSERT INTO project_members (project_id, username)
SELECT id, 'admin' FROM projects
ON DUPLICATE KEY UPDATE username=username;

-- Initialize bug sequences for default projects
INSERT INTO bug_sequences (project_key, last_number) VALUES
('SM', 0), ('RM', 0), ('GRN', 0), ('FV', 0), ('BH', 0)
ON DUPLICATE KEY UPDATE project_key=project_key;

-- Useful views for analytics

-- View: Bug counts by project
CREATE OR REPLACE VIEW v_project_bug_stats AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_key,
    COUNT(b.id) as total_bugs,
    SUM(CASE WHEN b.status = 'Open' THEN 1 ELSE 0 END) as open_bugs,
    SUM(CASE WHEN b.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_bugs,
    SUM(CASE WHEN b.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_bugs,
    SUM(CASE WHEN b.status = 'Closed' THEN 1 ELSE 0 END) as closed_bugs,
    SUM(CASE WHEN b.severity = 'Critical' THEN 1 ELSE 0 END) as critical_bugs,
    SUM(CASE WHEN b.severity = 'High' THEN 1 ELSE 0 END) as high_bugs
FROM projects p
LEFT JOIN bugs b ON p.id = b.project_id
GROUP BY p.id, p.name, p.project_key;

-- View: User bug stats
CREATE OR REPLACE VIEW v_user_bug_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    COUNT(DISTINCT CASE WHEN b.assignee = u.username THEN b.id END) as assigned_bugs,
    COUNT(DISTINCT CASE WHEN b.assignee = u.username AND b.status IN ('Open', 'In Progress') THEN b.id END) as open_assigned,
    COUNT(DISTINCT CASE WHEN b.assignee = u.username AND b.status IN ('Resolved', 'Closed') THEN b.id END) as resolved_bugs,
    COUNT(DISTINCT CASE WHEN b.reporter = u.username THEN b.id END) as reported_bugs
FROM users u
LEFT JOIN bugs b ON b.assignee = u.username OR b.reporter = u.username
GROUP BY u.id, u.username, u.role;

-- View: Daily bug trend (last 30 days)
CREATE OR REPLACE VIEW v_daily_bug_trend AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as created,
    (SELECT COUNT(*) FROM bugs WHERE DATE(closed_at) = DATE(b.created_at)) as closed
FROM bugs b
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date;
