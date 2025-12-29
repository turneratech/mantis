/**
 * Analytics Routes
 * Uses storage abstraction layer for data access
 */

const express = require('express');
const storage = require('../storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Comprehensive analytics for admin dashboard
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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
    const isAdmin = req.user.role === 'admin';
    const dashboard = await storage.getUserDashboard(req.user.username, isAdmin);
    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
