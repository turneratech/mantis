/**
 * BugTracker Server
 * 
 * Multi-project bug tracking system with automatic storage backend detection.
 * Supports both MySQL and CSV storage backends.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import storage factory
const storage = require('./storage');

// Import routes
const authRoutes = require('./routes/auth');
const bugRoutes = require('./routes/bugs');
const projectRoutes = require('./routes/projects');
const analyticsRoutes = require('./routes/analytics');
const attachmentsRoutes = require('./routes/attachments');  // NEW
const githubWebhook = require('./routes/github-webhook');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// FIX: Use JSON body parser for all routes EXCEPT the GitHub webhook
// The webhook needs the raw body to verify the HMAC signature
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/github') {
    // Skip JSON parsing for webhook - let the route handle it with express.raw()
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Serve uploaded files (for local storage)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));  // NEW

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attachments', attachmentsRoutes);  // NEW
app.use('/api/webhooks', githubWebhook);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const storageType = storage.getStorageType();
    const isConnected = await storage.getStorage().isConnected();
    
    res.json({ 
      status: 'ok',
      storage: {
        type: storageType,
        connected: isConnected
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'ok',
      storage: {
        type: 'unknown',
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Start server
const startServer = async () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║         BugTracker Server v2.0            ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Initialize storage (auto-detects MySQL or falls back to CSV)
    await storage.initializeStorage();
    
    console.log('');
    console.log(`Storage Type: ${storage.getStorageType().toUpperCase()}`);
    console.log('');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  • API:         http://localhost:${PORT}/api`);
      console.log(`  • Health:      http://localhost:${PORT}/api/health`);
      console.log(`  • Attachments: http://localhost:${PORT}/api/attachments`);
      console.log('');
      console.log('Default credentials: admin / admin123');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
