/**
 * MySQL Storage Implementation
 * Implements the storage interface using MySQL database
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { query, queryOne, transaction, testConnection, checkDatabase } = require('./db');

// ==================== USERS ====================

const getUserById = async (id) => {
  return await queryOne(
    'SELECT id, username, password, email, role, created_at as createdAt FROM users WHERE id = ?',
    [id]
  );
};

const getUserByUsername = async (username) => {
  return await queryOne(
    'SELECT id, username, password, email, role, created_at as createdAt FROM users WHERE username = ?',
    [username]
  );
};

const getAllUsers = async () => {
  return await query(
    'SELECT id, username, email, role, created_at as createdAt FROM users ORDER BY created_at DESC'
  );
};

const createUser = async (userData) => {
  const { id, username, password, email, role } = userData;
  await query(
    'INSERT INTO users (id, username, password, email, role) VALUES (?, ?, ?, ?, ?)',
    [id || uuidv4(), username, password, email || null, role || 'user']
  );
  return await getUserByUsername(username);
};

const deleteUser = async (id) => {
  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

const updateUserPassword = async (id, hashedPassword) => {
  await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
  return true;
};

// ==================== PROJECTS ====================

const getAllProjects = async (username, isAdmin) => {
  let projects;
  
  if (isAdmin) {
    projects = await query(`
      SELECT p.*, GROUP_CONCAT(pm.username) as members_list
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
  } else {
    projects = await query(`
      SELECT p.*, GROUP_CONCAT(pm2.username) as members_list
      FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id AND pm.username = ?
      LEFT JOIN project_members pm2 ON p.id = pm2.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [username]);
  }

  return projects.map(p => ({
    id: p.id,
    name: p.name,
    key: p.project_key,
    description: p.description,
    client: p.client,
    status: p.status,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    members: p.members_list ? p.members_list.split(',') : []
  }));
};

const getProjectById = async (id) => {
  const project = await queryOne(`
    SELECT p.*, GROUP_CONCAT(pm.username) as members_list
    FROM projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [id]);
  
  if (!project) return null;
  
  return {
    id: project.id,
    name: project.name,
    key: project.project_key,
    description: project.description,
    client: project.client,
    status: project.status,
    createdBy: project.created_by,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    members: project.members_list ? project.members_list.split(',') : []
  };
};

const getProjectByKey = async (key) => {
  const project = await queryOne(
    'SELECT id, name, project_key as `key`, client FROM projects WHERE project_key = ?',
    [key.toUpperCase()]
  );
  return project;
};

const createProject = async (projectData) => {
  const { id, name, key, description, client, status, createdBy, members } = projectData;
  const projectId = id || uuidv4();
  const projectKey = key.toUpperCase();
  
  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO projects (id, name, project_key, description, client, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, name, projectKey, description || '', client || '', status || 'active', createdBy]
    );
    
    // Initialize bug sequence
    await conn.execute(
      'INSERT INTO bug_sequences (project_key, last_number) VALUES (?, 0) ON DUPLICATE KEY UPDATE project_key=project_key',
      [projectKey]
    );
    
    // Add members
    const membersList = members || [createdBy];
    for (const member of membersList) {
      await conn.execute(
        'INSERT IGNORE INTO project_members (project_id, username) VALUES (?, ?)',
        [projectId, member]
      );
    }
  });
  
  return await getProjectById(projectId);
};

const updateProject = async (id, updates) => {
  const { name, description, client, status, members } = updates;
  
  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE projects SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        client = COALESCE(?, client),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [name, description, client, status, id]
    );
    
    if (members) {
      await conn.execute('DELETE FROM project_members WHERE project_id = ?', [id]);
      for (const member of members) {
        await conn.execute(
          'INSERT INTO project_members (project_id, username) VALUES (?, ?)',
          [id, member]
        );
      }
    }
  });
  
  return await getProjectById(id);
};

const deleteProject = async (id) => {
  const result = await query('DELETE FROM projects WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

const addProjectMember = async (projectId, username) => {
  await query(
    'INSERT IGNORE INTO project_members (project_id, username) VALUES (?, ?)',
    [projectId, username]
  );
  const members = await query(
    'SELECT username FROM project_members WHERE project_id = ?',
    [projectId]
  );
  return members.map(m => m.username);
};

const removeProjectMember = async (projectId, username) => {
  await query(
    'DELETE FROM project_members WHERE project_id = ? AND username = ?',
    [projectId, username]
  );
  const members = await query(
    'SELECT username FROM project_members WHERE project_id = ?',
    [projectId]
  );
  return members.map(m => m.username);
};

// ==================== BUGS ====================

const getActivityLog = async (bugId) => {
  return await query(
    `SELECT user, action, message, created_at as timestamp 
     FROM bug_activity 
     WHERE bug_id = ? 
     ORDER BY created_at ASC`,
    [bugId]
  );
};

const formatBug = async (bug, includeActivity = true) => {
  const formatted = {
    bugId: bug.bug_id,
    title: bug.title,
    description: bug.description,
    client: bug.client,
    module: bug.module,
    environment: bug.environment,
    severity: bug.severity,
    priority: bug.priority,
    status: bug.status,
    reporter: bug.reporter,
    assignee: bug.assignee,
    qaOwner: bug.qa_owner,
    qaStatus: bug.qa_status,
    targetFixVersion: bug.target_fix_version,
    dueSLA: bug.due_sla,
    attachmentLinks: bug.attachment_links,
    closureReason: bug.closure_reason,
    arb: bug.Temp1 ? JSON.parse(bug.Temp1) : [],
    created: bug.created_at,
    lastUpdated: bug.updated_at,
    closedDate: bug.closed_at,
    projectId: bug.project_id,
    projectKey: bug.project_key,
    projectName: bug.projectName || bug.project_name
  };
  
  if (includeActivity) {
    formatted.activityLog = await getActivityLog(bug.bug_id);
  }
  
  return formatted;
};

const getAllBugs = async (limit = 500) => {
  const bugs = await query(`
    SELECT b.*, p.name as projectName
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    ORDER BY b.updated_at DESC
    LIMIT ?
  `, [limit]);
  
  return await Promise.all(bugs.map(bug => formatBug(bug)));
};

const getBugsByProject = async (projectKey) => {
  const bugs = await query(`
    SELECT b.*, p.name as projectName
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    WHERE b.project_key = ?
    ORDER BY b.updated_at DESC
  `, [projectKey.toUpperCase()]);
  
  return await Promise.all(bugs.map(bug => formatBug(bug)));
};

const getBugsByUser = async (username) => {
  const bugs = await query(`
    SELECT b.*, p.name as projectName
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    WHERE b.assignee = ? OR b.reporter = ? OR b.qa_owner = ?
    ORDER BY b.updated_at DESC
  `, [username, username, username]);
  
  return await Promise.all(bugs.map(bug => formatBug(bug)));
};

const getBugById = async (bugId) => {
  const bug = await queryOne(`
    SELECT b.*, p.name as projectName
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    WHERE b.bug_id = ?
  `, [bugId]);
  
  if (!bug) return null;
  return await formatBug(bug);
};

const generateBugId = async (projectKey) => {
  return await transaction(async (conn) => {
    const key = projectKey.toUpperCase();
    const [rows] = await conn.execute(
      'SELECT last_number FROM bug_sequences WHERE project_key = ? FOR UPDATE',
      [key]
    );
    
    let nextNumber = 1;
    if (rows.length > 0) {
      nextNumber = rows[0].last_number + 1;
      await conn.execute(
        'UPDATE bug_sequences SET last_number = ? WHERE project_key = ?',
        [nextNumber, key]
      );
    } else {
      await conn.execute(
        'INSERT INTO bug_sequences (project_key, last_number) VALUES (?, ?)',
        [key, 1]
      );
    }
    
    return `${key}-${String(nextNumber).padStart(4, '0')}`;
  });
};

const createBug = async (bugData, reporter) => {
  const {
    bugId, projectId, projectKey, title, description, client, module,
    environment, severity, priority, assignee, qaOwner,
    targetFixVersion, dueSLA, attachmentLinks, arb
  } = bugData;
  
  // Convert date format if needed
  const formattedDueSLA = dueSLA ? dueSLA.split('T')[0] : null;
  
  await transaction(async (conn) => {
    await conn.execute(`
      INSERT INTO bugs (
        bug_id, project_id, project_key, title, description, client, module,
        environment, severity, priority, status, reporter, assignee,
        qa_owner, qa_status, target_fix_version, due_sla, attachment_links, arb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, 'Not Started', ?, ?, ?, ?)
    `, [
      bugId, projectId, projectKey, title || '', description || '',
      client || '', module || '', environment || 'Development',
      severity || 'Medium', priority || 'Medium', reporter,
      assignee || null, qaOwner || null, targetFixVersion || null,
      formattedDueSLA, attachmentLinks || null,
      arb && arb.length > 0 ? JSON.stringify(arb) : null
    ]);

    await conn.execute(
      'INSERT INTO bug_activity (bug_id, user, action, message) VALUES (?, ?, ?, ?)',
      [bugId, reporter, 'created', 'Bug created']
    );
  });

  return await getBugById(bugId);
};


const updateBug = async (bugId, updates, updatedBy) => {
  const bug = await queryOne('SELECT * FROM bugs WHERE bug_id = ?', [bugId]);
  if (!bug) return null;

  const {
    title, description, client, module, environment,
    severity, priority, status, assignee, qaOwner, qaStatus,
    targetFixVersion, dueSLA, attachmentLinks, closureReason, arb
  } = updates;

  // Convert date format if needed
  const formattedDueSLA = dueSLA ? dueSLA.split('T')[0] : (dueSLA === '' ? null : undefined);

  // Track changes
  const changes = [];
  const fieldsToTrack = ['status', 'assignee', 'priority', 'severity', 'qaStatus'];
  const fieldMap = { qaStatus: 'qa_status' };

  fieldsToTrack.forEach(field => {
    const dbField = fieldMap[field] || field;
    const newValue = updates[field];
    if (newValue !== undefined && newValue !== bug[dbField]) {
      changes.push(`${field}: "${bug[dbField] || ''}" → "${newValue}"`);
    }
  });

  // Track ARB changes
  if (arb !== undefined) {
    const oldArb = bug.arb ? JSON.parse(bug.arb) : [];
    if (JSON.stringify(oldArb) !== JSON.stringify(arb)) {
      changes.push(`ARB: "${oldArb.join(', ')}" → "${arb.join(', ')}"`);
    }
  }

  // Handle closed date and reset ARB when closed
  let closedAt = bug.closed_at;
  let finalArb = arb !== undefined ? arb : (bug.arb ? JSON.parse(bug.arb) : []);

  if (status === 'Closed' && bug.status !== 'Closed') {
    closedAt = new Date();
    finalArb = [];  // Reset ARB when closed
    changes.push('ARB cleared on closure');
  } else if (status && status !== 'Closed') {
    closedAt = null;
  }

  await transaction(async (conn) => {
    await conn.execute(`
      UPDATE bugs SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        client = COALESCE(?, client),
        module = COALESCE(?, module),
        environment = COALESCE(?, environment),
        severity = COALESCE(?, severity),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        assignee = ?,
        qa_owner = ?,
        qa_status = COALESCE(?, qa_status),
        target_fix_version = ?,
        due_sla = COALESCE(?, due_sla),
        attachment_links = ?,
        closure_reason = ?,
        closed_at = ?,
        arb = ?
      WHERE bug_id = ?
    `, [
      title, description, client, module, environment,
      severity, priority, status,
      assignee !== undefined ? assignee : bug.assignee,
      qaOwner !== undefined ? qaOwner : bug.qa_owner,
      qaStatus,
      targetFixVersion !== undefined ? targetFixVersion : bug.target_fix_version,
      formattedDueSLA,
      attachmentLinks !== undefined ? attachmentLinks : bug.attachment_links,
      closureReason !== undefined ? closureReason : bug.closure_reason,
      closedAt,
      finalArb.length > 0 ? JSON.stringify(finalArb) : null,
      bugId
    ]);

    if (changes.length > 0) {
      await conn.execute(
        'INSERT INTO bug_activity (bug_id, user, action, message) VALUES (?, ?, ?, ?)',
        [bugId, updatedBy, 'updated', `Updated: ${changes.join(', ')}`]
      );
    }
  });

  return await getBugById(bugId);
};



const deleteBug = async (bugId) => {
  await query('DELETE FROM bug_activity WHERE bug_id = ?', [bugId]);
  const result = await query('DELETE FROM bugs WHERE bug_id = ?', [bugId]);
  return result.affectedRows > 0;
};

const addBugComment = async (bugId, username, comment) => {
  await transaction(async (conn) => {
    await conn.execute(
      'INSERT INTO bug_activity (bug_id, user, action, message) VALUES (?, ?, ?, ?)',
      [bugId, username, 'comment', comment]
    );
    await conn.execute('UPDATE bugs SET updated_at = NOW() WHERE bug_id = ?', [bugId]);
  });
  
  return await getBugById(bugId);
};

const getBugStats = async (projectKey) => {
  const stats = await queryOne(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as \`open\`,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high
    FROM bugs
    WHERE project_key = ?
  `, [projectKey.toUpperCase()]);

  return {
    total: stats.total || 0,
    open: stats.open || 0,
    inProgress: stats.inProgress || 0,
    resolved: stats.resolved || 0,
    closed: stats.closed || 0,
    critical: stats.critical || 0,
    high: stats.high || 0
  };
};

// ==================== ANALYTICS ====================

const getAdminAnalytics = async () => {
  // Overall stats
  const overallStats = await queryOne(`
    SELECT 
      (SELECT COUNT(*) FROM bugs) as totalBugs,
      (SELECT COUNT(*) FROM projects) as totalProjects,
      (SELECT COUNT(*) FROM users) as totalUsers,
      (SELECT COUNT(*) FROM bugs WHERE status = 'Open') as openBugs,
      (SELECT COUNT(*) FROM bugs WHERE status = 'In Progress') as inProgressBugs,
      (SELECT COUNT(*) FROM bugs WHERE status = 'Resolved') as resolvedBugs,
      (SELECT COUNT(*) FROM bugs WHERE status = 'Closed') as closedBugs,
      (SELECT COUNT(*) FROM bugs WHERE severity = 'Critical') as criticalBugs,
      (SELECT COUNT(*) FROM bugs WHERE severity = 'High') as highBugs,
      (SELECT COUNT(*) FROM bugs WHERE severity = 'Medium') as mediumBugs,
      (SELECT COUNT(*) FROM bugs WHERE severity = 'Low') as lowBugs
  `);

  // Distributions
  const statusDistribution = [
    { name: 'Open', value: overallStats.openBugs || 0, color: '#3b82f6' },
    { name: 'In Progress', value: overallStats.inProgressBugs || 0, color: '#8b5cf6' },
    { name: 'Resolved', value: overallStats.resolvedBugs || 0, color: '#10b981' },
    { name: 'Closed', value: overallStats.closedBugs || 0, color: '#6b7280' }
  ].filter(s => s.value > 0);

  const severityDistribution = [
    { name: 'Critical', value: overallStats.criticalBugs || 0, color: '#dc2626' },
    { name: 'High', value: overallStats.highBugs || 0, color: '#f97316' },
    { name: 'Medium', value: overallStats.mediumBugs || 0, color: '#eab308' },
    { name: 'Low', value: overallStats.lowBugs || 0, color: '#22c55e' }
  ].filter(s => s.value > 0);

  const priorityData = await query('SELECT priority, COUNT(*) as count FROM bugs GROUP BY priority');
  const priorityMap = { Critical: '#dc2626', High: '#f97316', Medium: '#eab308', Low: '#22c55e' };
  const priorityDistribution = priorityData
    .map(p => ({ name: p.priority, value: p.count, color: priorityMap[p.priority] }))
    .filter(p => p.value > 0);

  // Project stats
  const projectStats = await query(`
    SELECT 
      p.id as projectId, p.name as projectName, p.project_key as projectKey,
      COUNT(b.id) as total,
      SUM(CASE WHEN b.status = 'Open' THEN 1 ELSE 0 END) as \`open\`,
      SUM(CASE WHEN b.status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN b.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN b.status = 'Closed' THEN 1 ELSE 0 END) as closed,
      SUM(CASE WHEN b.severity = 'Critical' THEN 1 ELSE 0 END) as critical
    FROM projects p
    LEFT JOIN bugs b ON p.id = b.project_id
    GROUP BY p.id, p.name, p.project_key
    ORDER BY total DESC
  `);

  // User stats
  const userStats = await query(`
    SELECT 
      u.id as userId, u.username, u.role,
      COUNT(DISTINCT CASE WHEN b.assignee = u.username THEN b.id END) as assigned,
      COUNT(DISTINCT CASE WHEN b.assignee = u.username AND b.status IN ('Open', 'In Progress') THEN b.id END) as assignedOpen,
      COUNT(DISTINCT CASE WHEN b.reporter = u.username THEN b.id END) as reported,
      COUNT(DISTINCT CASE WHEN b.assignee = u.username AND b.status IN ('Resolved', 'Closed') THEN b.id END) as resolved
    FROM users u
    LEFT JOIN bugs b ON b.assignee = u.username OR b.reporter = u.username
    GROUP BY u.id, u.username, u.role
    ORDER BY assigned DESC
  `);

  // Bug trend (last 30 days)
  const bugTrend = await query(`
    SELECT 
      DATE(d.date) as date,
      COALESCE(created.cnt, 0) as created,
      COALESCE(closed.cnt, 0) as closed
    FROM (
      SELECT DATE_SUB(CURDATE(), INTERVAL n DAY) as date
      FROM (
        SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
        UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
        UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
        UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
        UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
      ) numbers
    ) d
    LEFT JOIN (
      SELECT DATE(created_at) as dt, COUNT(*) as cnt FROM bugs 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
      GROUP BY DATE(created_at)
    ) created ON d.date = created.dt
    LEFT JOIN (
      SELECT DATE(closed_at) as dt, COUNT(*) as cnt FROM bugs 
      WHERE closed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
      GROUP BY DATE(closed_at)
    ) closed ON d.date = closed.dt
    ORDER BY d.date ASC
  `);

  // Weekly trend
  const weeklyTrend = await query(`
    SELECT 
      CONCAT('W', w.week_num) as week,
      COALESCE(created.cnt, 0) as created,
      COALESCE(closed.cnt, 0) as closed
    FROM (
      SELECT 1 week_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
      UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
    ) w
    LEFT JOIN (
      SELECT WEEK(created_at) as wk, COUNT(*) as cnt FROM bugs 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK) 
      GROUP BY WEEK(created_at)
    ) created ON WEEK(DATE_SUB(CURDATE(), INTERVAL (12 - w.week_num) WEEK)) = created.wk
    LEFT JOIN (
      SELECT WEEK(closed_at) as wk, COUNT(*) as cnt FROM bugs 
      WHERE closed_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK) 
      GROUP BY WEEK(closed_at)
    ) closed ON WEEK(DATE_SUB(CURDATE(), INTERVAL (12 - w.week_num) WEEK)) = closed.wk
    ORDER BY w.week_num ASC
  `);

  // Most active bugs
  const mostActiveBugs = await query(`
    SELECT 
      b.bug_id as bugId, b.title, p.name as projectName, b.project_key as projectKey,
      b.status, b.severity, b.priority, b.assignee, b.reporter,
      b.updated_at as lastUpdated, COUNT(ba.id) as activityCount
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    LEFT JOIN bug_activity ba ON b.bug_id = ba.bug_id
    GROUP BY b.id, b.bug_id, b.title, p.name, b.project_key, b.status, 
             b.severity, b.priority, b.assignee, b.reporter, b.updated_at
    ORDER BY b.updated_at DESC, activityCount DESC
    LIMIT 10
  `);

  // Average resolution time
  const avgResolution = await queryOne(`
    SELECT AVG(DATEDIFF(closed_at, created_at)) as avgDays
    FROM bugs WHERE closed_at IS NOT NULL
  `);

  // Environment stats
  const environmentStats = await query(`
    SELECT environment as name, COUNT(*) as value
    FROM bugs GROUP BY environment HAVING COUNT(*) > 0
  `);

  return {
    overallStats,
    statusDistribution,
    severityDistribution,
    priorityDistribution,
    projectStats,
    userStats,
    bugTrend: bugTrend.map(t => ({ 
      ...t, 
      date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date 
    })),
    weeklyTrend,
    mostActiveBugs,
    avgResolutionTime: Math.round(avgResolution?.avgDays || 0),
    environmentStats
  };
};

const getUserDashboard = async (username, isAdmin) => {
  // User bug stats
  const stats = await queryOne(`
    SELECT 
      COUNT(DISTINCT CASE WHEN assignee = ? THEN id END) as assignedTotal,
      COUNT(DISTINCT CASE WHEN assignee = ? AND status = 'Open' THEN id END) as assignedOpen,
      COUNT(DISTINCT CASE WHEN assignee = ? AND status = 'In Progress' THEN id END) as assignedInProgress,
      COUNT(DISTINCT CASE WHEN assignee = ? AND status IN ('Resolved', 'Closed') THEN id END) as assignedResolved,
      COUNT(DISTINCT CASE WHEN reporter = ? THEN id END) as reportedTotal,
      COUNT(DISTINCT CASE WHEN qa_owner = ? THEN id END) as qaTotal,
      COUNT(DISTINCT CASE WHEN qa_owner = ? AND qa_status = 'Failed' THEN id END) as qaFailed
    FROM bugs
  `, [username, username, username, username, username, username, username]);

  // Project summaries
  const projectSummaries = await query(`
    SELECT 
      p.id as projectId, p.name as projectName, p.project_key as projectKey,
      COUNT(b.id) as totalBugs,
      COUNT(CASE WHEN b.assignee = ? OR b.reporter = ? OR b.qa_owner = ? THEN b.id END) as myBugs,
      SUM(CASE WHEN b.status = 'Open' THEN 1 ELSE 0 END) as openBugs,
      SUM(CASE WHEN b.severity = 'Critical' THEN 1 ELSE 0 END) as criticalBugs
    FROM projects p
    ${!isAdmin ? 'INNER JOIN project_members pm ON p.id = pm.project_id AND pm.username = ?' : ''}
    LEFT JOIN bugs b ON p.id = b.project_id
    GROUP BY p.id, p.name, p.project_key
    ORDER BY myBugs DESC
  `, !isAdmin ? [username, username, username, username] : [username, username, username]);

  // Recent bugs
  const recentBugs = await query(`
    SELECT 
      b.bug_id as bugId, b.title, p.name as projectName, b.project_key as projectKey,
      b.status, b.severity, b.updated_at as lastUpdated,
      CASE WHEN b.assignee = ? THEN 1 ELSE 0 END as isAssigned,
      CASE WHEN b.reporter = ? THEN 1 ELSE 0 END as isReported
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    WHERE b.assignee = ? OR b.reporter = ? OR b.qa_owner = ?
    ORDER BY b.updated_at DESC LIMIT 10
  `, [username, username, username, username, username]);

  // Status distribution
  const myStatusDistribution = await query(`
    SELECT status as name, COUNT(*) as value
    FROM bugs WHERE assignee = ? GROUP BY status HAVING COUNT(*) > 0
  `, [username]);

  // Project count
  let projectCount;
  if (isAdmin) {
    const result = await queryOne('SELECT COUNT(*) as count FROM projects');
    projectCount = result.count;
  } else {
    const result = await queryOne(
      'SELECT COUNT(DISTINCT project_id) as count FROM project_members WHERE username = ?',
      [username]
    );
    projectCount = result.count;
  }

  return {
    stats: {
      assignedTotal: stats.assignedTotal || 0,
      assignedOpen: stats.assignedOpen || 0,
      assignedInProgress: stats.assignedInProgress || 0,
      assignedResolved: stats.assignedResolved || 0,
      reportedTotal: stats.reportedTotal || 0,
      qaTotal: stats.qaTotal || 0,
      qaFailed: stats.qaFailed || 0
    },
    projectSummaries,
    recentBugs: recentBugs.map(b => ({
      ...b,
      isAssigned: b.isAssigned === 1,
      isReported: b.isReported === 1
    })),
    myStatusDistribution,
    projectCount
  };
};

// ==================== SYSTEM ====================

const getStorageType = () => 'mysql';

const isConnected = async () => {
  return await testConnection();
};

const initialize = async () => {
  // Check if tables exist, if not they need to run schema.sql
  const dbExists = await checkDatabase();
  if (!dbExists) {
    console.log('MySQL tables not found. Please run: mysql -u root -p bugtracker < server/database/schema.sql');
  }
  return dbExists;
};

module.exports = {
  // Users
  getUserById,
  getUserByUsername,
  getAllUsers,
  createUser,
  deleteUser,
  updateUserPassword,
  // Projects
  getAllProjects,
  getProjectById,
  getProjectByKey,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  // Bugs
  getAllBugs,
  getBugsByProject,
  getBugsByUser,
  getBugById,
  generateBugId,
  createBug,
  updateBug,
  deleteBug,
  addBugComment,
  getBugStats,
  // Analytics
  getAdminAnalytics,
  getUserDashboard,
  // System
  getStorageType,
  isConnected,
  initialize
};
