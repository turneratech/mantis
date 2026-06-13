/**
 * Mantis Server
 * 
 * Mantis — multi-project bug tracking with automatic storage backend detection.
 * Supports both MySQL and CSV storage backends.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const emailRoutes = require('./routes/email');
const emailService = require('./services/emailService');
const licenseService = require('./services/licenseService');
const licenseRoutes = require('./routes/license');
const deploymentRoutes = require('./routes/deployment');
const { attachLicenseInfo } = require('./middleware/licenseValidator');
const webhookService = require('./services/webhookService');
const fileStorageService = require('./services/fileStorageService');

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
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://3.128.196.248'],
  credentials: true
}));

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Brand assets (logos) — repo root imgs/ folder, served at /mantis/imgs
app.use('/mantis/imgs', express.static(path.join(__dirname, '../../imgs')));
app.use('/imgs', express.static(path.join(__dirname, '../../imgs')));

// Attach license info to every request (cached, non-blocking)
app.use(attachLicenseInfo);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/attachments', attachmentsRoutes);  // NEW
app.use('/api/webhooks', githubWebhook);
app.use('/api/email', emailRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/deployment', deploymentRoutes);

async function initializeEmailService() {
  if (!storage.isSqlStorage()) {
    console.log('[EmailService] Skipped — scheduled email reports require MySQL or PostgreSQL (current: CSV)');
    return;
  }

  try {
    await emailService.initializeTransporter();
    await emailService.loadScheduledReports();
    console.log('[Server] Email service initialized');
  } catch (error) {
    console.error('[Server] Email service error:', error.message);
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const storageType = storage.getStorageType();
    const isConnected = await storage.getStorage().isConnected();
    
    const deploymentConfig = require('./config/deployment.config');
    const fileStorage = fileStorageService.getFileStorage();

    res.json({
      status: 'ok',
      storage: {
        type: storageType,
        connected: isConnected,
        provider: deploymentConfig.getDatabaseProvider()
      },
      fileStorage: {
        default: fileStorage?.defaultProvider || 'local',
        providers: fileStorage?.listProviders() || ['local']
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

// Serve static files in production (app is built for /mantis base path)
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/build');
  app.use('/mantis', express.static(clientBuild));
  app.get('/mantis/*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Start server
const startServer = async () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║         Mantis Server v2.0            ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Initialize storage (auto-detects MySQL or falls back to CSV)
    await storage.initializeStorage();

    fileStorageService.initFileStorage();
    webhookService.loadPlugins();

    // Initialize license service after storage is ready
    await licenseService.initialize();

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
    
    initializeEmailService()

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
