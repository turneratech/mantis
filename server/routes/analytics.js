/**
 * Analytics Routes
 * Uses storage abstraction layer for data access
 * 
 * ROLES:
 * - godmode: Full access to all analytics
 * - admin: Full access to all analytics
 * - user: Limited to user dashboard
 */

const express = require('express');
const storage = require('../storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper function to check if user has elevated privileges
const hasElevatedPrivileges = (user) => {
  return user && (user.role === 'godmode' || user.role === 'admin');
};

// Comprehensive analytics for admin dashboard (admin and godmode only)
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    if (!hasElevatedPrivileges(req.user)) {
      return res.status(403).json({ error: 'Admin or super user access required' });
    }

    const analytics = await storage.getAdminAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User-specific dashboard stats
router.get('/user-dashboard', authMiddleware, async (req, res) => {
  try {
    const isPrivileged = hasElevatedPrivileges(req.user);
    const dashboard = await storage.getUserDashboard(req.user.username, isPrivileged);
    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
