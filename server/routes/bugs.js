/**
 * Bug Routes
 * Uses storage abstraction layer for data access
 */

const express = require('express');
const storage = require('../storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all bugs across all projects (for admin dashboard)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const bugs = await storage.getAllBugs(500);
    res.json(bugs);
  } catch (error) {
    console.error('Error fetching all bugs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bugs for a specific project
router.get('/project/:projectKey', authMiddleware, async (req, res) => {
  try {
    const bugs = await storage.getBugsByProject(req.params.projectKey);
    res.json(bugs);
  } catch (error) {
    console.error('Error fetching bugs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bugs assigned to current user
router.get('/my-bugs', authMiddleware, async (req, res) => {
  try {
    const bugs = await storage.getBugsByUser(req.user.username);
    res.json(bugs);
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

// Delete bug
router.delete('/:projectKey/:bugId', authMiddleware, async (req, res) => {
  try {
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
