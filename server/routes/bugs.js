/**
 * Bug Routes
 * Uses storage abstraction layer for data access
 * 
 * Visibility Rules:
 * - Admin: Can see all bugs
 * - Regular User: Can see bugs where they are assignee, reporter, or in ARB
 */

const express = require('express');
const storage = require('../storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Check if user can view a bug
 */
const canUserViewBug = (bug, username, isAdmin) => {
  if (isAdmin) return true;
  
  // User is assignee
  if (bug.assignee === username) return true;
  
  // User is reporter
  if (bug.reporter === username) return true;
  
  // User is QA owner
  if (bug.qaOwner === username || bug.qa_owner === username) return true;
  
  // User is in ARB list
  const arb = bug.arb || [];
  const arbList = Array.isArray(arb) ? arb : (typeof arb === 'string' ? arb.split(',').map(s => s.trim()) : []);
  if (arbList.includes(username)) return true;
  
  return false;
};

/**
 * Filter bugs based on user visibility
 */
const filterBugsForUser = (bugs, username, isAdmin) => {
  if (isAdmin) return bugs;
  return bugs.filter(bug => canUserViewBug(bug, username, isAdmin));
};

// Get all bugs across all projects (for admin dashboard)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let bugs;
    
    try {
      bugs = await storage.getAllBugs();
    } catch (e) {
      console.error('getAllBugs error:', e.message);
      // Return empty array on error
      bugs = [];
    }
    
    // Filter for non-admins
    bugs = filterBugsForUser(bugs, req.user.username, isAdmin);
    
    res.json(bugs);
  } catch (error) {
    console.error('Error fetching all bugs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bugs for a specific project
router.get('/project/:projectKey', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let bugs = await storage.getBugsByProject(req.params.projectKey);
    
    // Filter for non-admins
    bugs = filterBugsForUser(bugs, req.user.username, isAdmin);
    
    res.json(bugs);
  } catch (error) {
    console.error('Error fetching bugs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bugs assigned to current user (includes ARB)
router.get('/my-bugs', authMiddleware, async (req, res) => {
  try {
    const username = req.user.username;
    const isAdmin = req.user.role === 'admin';
    
    // For admin, return all bugs
    if (isAdmin) {
      try {
        const bugs = await storage.getAllBugs();
        return res.json(bugs);
      } catch (e) {
        // Fallback if getAllBugs fails
        console.error('getAllBugs failed, using getBugsByUser fallback:', e.message);
        const bugs = await storage.getBugsByUser(username);
        return res.json(bugs);
      }
    }
    
    // For regular users, get bugs assigned to them
    const assignedBugs = await storage.getBugsByUser(username);
    
    // Create a map to avoid duplicates
    const bugMap = new Map();
    assignedBugs.forEach(bug => bugMap.set(bug.bugId, bug));
    
    res.json(Array.from(bugMap.values()));
  } catch (error) {
    console.error('Error fetching user bugs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single bug
router.get('/:projectKey/:bugId', authMiddleware, async (req, res) => {
  try {
    const bug = await storage.getBugById(req.params.bugId);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    
    // Check visibility
    const isAdmin = req.user.role === 'admin';
    if (!canUserViewBug(bug, req.user.username, isAdmin)) {
      return res.status(403).json({ error: 'You do not have permission to view this bug' });
    }
    
    res.json(bug);
  } catch (error) {
    console.error('Error fetching bug:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new bug
router.post('/:projectKey', authMiddleware, async (req, res) => {
  try {
    const projectKey = req.params.projectKey.toUpperCase();
    
    // Verify project exists
    const project = await storage.getProjectByKey(projectKey);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate bug ID
    const bugId = await storage.generateBugId(projectKey);
    
    const {
      title, description, client, module, environment,
      severity, priority, assignee, targetFixVersion,
      dueSLA, attachmentLinks, qaOwner, arb
    } = req.body;

    const bug = await storage.createBug({
      bugId,
      projectId: project.id,
      projectKey,
      title: title || '',
      description: description || '',
      client: client || project.client || '',
      module: module || '',
      environment: environment || 'Development',
      severity: severity || 'Medium',
      priority: priority || 'Medium',
      assignee: assignee || '',
      qaOwner: qaOwner || '',
      targetFixVersion: targetFixVersion || '',
      dueSLA: dueSLA || '',
      attachmentLinks: attachmentLinks || '',
      arb: arb || []
    }, req.user.username);

    res.status(201).json(bug);
  } catch (error) {
    console.error('Error creating bug:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bug
router.put('/:projectKey/:bugId', authMiddleware, async (req, res) => {
  try {
    const bug = await storage.getBugById(req.params.bugId);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    
    // Check if user can edit (admin, assignee, reporter, or in ARB)
    const isAdmin = req.user.role === 'admin';
    if (!canUserViewBug(bug, req.user.username, isAdmin)) {
      return res.status(403).json({ error: 'You do not have permission to edit this bug' });
    }

    const {
      title, description, client, module, environment,
      severity, priority, status, assignee, qaOwner, qaStatus,
      targetFixVersion, dueSLA, attachmentLinks, closureReason, arb
    } = req.body;

    const updated = await storage.updateBug(req.params.bugId, {
      title,
      description,
      client,
      module,
      environment,
      severity,
      priority,
      status,
      assignee,
      qaOwner,
      qaStatus,
      targetFixVersion,
      dueSLA,
      attachmentLinks,
      closureReason,
      arb	    
    }, req.user.username);

    res.json(updated);
  } catch (error) {
    console.error('Error updating bug:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to bug
router.post('/:projectKey/:bugId/comment', authMiddleware, async (req, res) => {
  try {
    const bug = await storage.getBugById(req.params.bugId);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    
    // Check visibility before allowing comment
    const isAdmin = req.user.role === 'admin';
    if (!canUserViewBug(bug, req.user.username, isAdmin)) {
      return res.status(403).json({ error: 'You do not have permission to comment on this bug' });
    }

    const updated = await storage.addBugComment(
      req.params.bugId,
      req.user.username,
      req.body.comment
    );

    res.json(updated);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete bug (admin only)
router.delete('/:projectKey/:bugId', authMiddleware, async (req, res) => {
  try {
    // Only admin can delete bugs
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete bugs' });
    }
    
    const deleted = await storage.deleteBug(req.params.bugId);
    if (!deleted) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    res.json({ message: 'Bug deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stats for a project
router.get('/stats/:projectKey', authMiddleware, async (req, res) => {
  try {
    const stats = await storage.getBugStats(req.params.projectKey);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

