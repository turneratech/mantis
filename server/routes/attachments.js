/**
 * Attachments Route - File upload/download API
 * Supports Local and Azure Blob Storage
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ============================================
// AUTH MIDDLEWARE
// ============================================
let authMiddleware;

try {
  const auth = require('./auth');
  authMiddleware = auth.authMiddleware;
  console.log('[Attachments] Loaded auth from ./auth');
} catch (e) {
  try {
    const auth = require('../auth');
    authMiddleware = auth.authMiddleware;
    console.log('[Attachments] Loaded auth from ../auth');
  } catch (e2) {
    console.log('[Attachments] Could not find auth module, using fallback');
  }
}

// Fallback auth middleware
if (!authMiddleware) {
  console.log('[Attachments] Using fallback JWT auth');
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// ============================================
// DIRECT MYSQL UPDATE (bypasses storage module issues)
// ============================================
const updateBugAttachments = async (bugId, attachmentsJson) => {
  try {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bugtracker',
      waitForConnections: true,
      connectionLimit: 5
    });
    
    const column = await detectBugIdColumn(pool);
    await pool.execute(
      `UPDATE bugs SET attachments = ?, updated_at = NOW() WHERE ${column} = ?`,
      [attachmentsJson, bugId]
    );
    
    await pool.end();
    console.log('[Attachments] Database updated for bug:', bugId);
    return true;
  } catch (err) {
    console.error('[Attachments] Direct MySQL update failed:', err.message);
    return false;
  }
};

// Cache the bug ID column name
let bugIdColumn = null;

// Detect the correct bug ID column name
const detectBugIdColumn = async (pool) => {
  if (bugIdColumn) return bugIdColumn;
  
  try {
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bugs'",
      [process.env.DB_NAME || 'bugtracker']
    );
    
    const columnNames = columns.map(c => c.COLUMN_NAME.toLowerCase());
    
    // Check for common bug ID column names
    if (columnNames.includes('bug_id')) {
      bugIdColumn = 'bug_id';
    } else if (columnNames.includes('bugid')) {
      bugIdColumn = 'bugId';
    } else if (columnNames.includes('id')) {
      bugIdColumn = 'id';
    } else {
      // Default fallback
      bugIdColumn = 'bug_id';
    }
    
    console.log('[Attachments] Detected bug ID column:', bugIdColumn);
    return bugIdColumn;
  } catch (err) {
    console.error('[Attachments] Column detection failed:', err.message);
    return 'bug_id';
  }
};

// Get bug by ID directly from MySQL
const getBugById = async (bugId) => {
  try {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bugtracker',
      waitForConnections: true,
      connectionLimit: 5
    });
    
    const column = await detectBugIdColumn(pool);
    const [rows] = await pool.execute(`SELECT * FROM bugs WHERE ${column} = ?`, [bugId]);
    
    await pool.end();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[Attachments] getBugById failed:', err.message);
    return null;
  }
};

// ============================================
// STORAGE INITIALIZATION
// ============================================

let storage = null;
let storageError = null;

const initStorage = () => {
  if (storage) return storage;
  if (storageError) return null;
  
  try {
    // Find hybrid-storage module
    let createStorage;
    const possiblePaths = [
      path.join(__dirname, '../../hybrid-storage/src'),
      path.join(__dirname, '../hybrid-storage/src'),
      path.join(__dirname, '../../hybrid-storage'),
    ];
    
    for (const p of possiblePaths) {
      try {
        const module = require(p);
        createStorage = module.createStorage;
        if (createStorage) {
          console.log('[Attachments] Found hybrid-storage at:', p);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!createStorage) {
      throw new Error('hybrid-storage module not found. Make sure hybrid-storage folder exists.');
    }
    
    // Build config
    const config = {
      local: {
        basePath: path.join(__dirname, '../../uploads'),
        baseUrl: '/uploads'
      }
    };
    
    // Azure Blob Storage Configuration
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      console.log('[Attachments] Configuring Azure Blob with connection string');
      config.azure = {
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
        containerName: process.env.AZURE_STORAGE_CONTAINER || 'bugtracker',
        baseFolder: process.env.AZURE_STORAGE_FOLDER || 'attachments'
      };
    } else if (process.env.AZURE_BLOB_ENDPOINT && process.env.AZURE_SAS_TOKEN) {
      console.log('[Attachments] Configuring Azure Blob with endpoint + SAS');
      config.azure = {
        blobEndpoint: process.env.AZURE_BLOB_ENDPOINT,
        sasToken: process.env.AZURE_SAS_TOKEN,
        containerName: process.env.AZURE_STORAGE_CONTAINER || 'bugtracker',
        baseFolder: process.env.AZURE_STORAGE_FOLDER || 'attachments'
      };
    } else if (process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY) {
      console.log('[Attachments] Configuring Azure Blob with account + key');
      config.azure = {
        accountName: process.env.AZURE_STORAGE_ACCOUNT,
        accountKey: process.env.AZURE_STORAGE_KEY,
        containerName: process.env.AZURE_STORAGE_CONTAINER || 'bugtracker',
        baseFolder: process.env.AZURE_STORAGE_FOLDER || 'attachments'
      };
    }
    
    // Set default - Azure if configured, else local
    if (process.env.DEFAULT_STORAGE) {
      config.default = process.env.DEFAULT_STORAGE;
    } else if (config.azure) {
      config.default = 'azure';
    } else {
      config.default = 'local';
    }
    
    console.log('[Attachments] Creating storage with config:', {
      hasLocal: !!config.local,
      hasAzure: !!config.azure,
      default: config.default
    });
    
    storage = createStorage(config);
    console.log('[Attachments] Storage initialized. Providers:', storage.listProviders());
    console.log('[Attachments] Default provider:', storage.defaultProvider);
    
    return storage;
    
  } catch (err) {
    console.error('[Attachments] Storage init error:', err.message);
    console.error(err.stack);
    storageError = err.message;
    return null;
  }
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[Attachments] Created uploads directory:', uploadsDir);
  } catch (err) {
    console.error('[Attachments] Could not create uploads directory:', err.message);
  }
}

// ============================================
// MULTER CONFIG
// ============================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.msi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error(`File type ${ext} not allowed`), false);
    }
    cb(null, true);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const parseAttachments = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } 
    catch { return []; }
  }
  return [];
};

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ============================================
// API ROUTES
// ============================================

/**
 * GET /api/attachments/providers
 * List available storage providers
 */
router.get('/providers', authMiddleware, (req, res) => {
  const storageInstance = initStorage();
  
  if (!storageInstance) {
    return res.json({ 
      providers: ['local'], 
      default: 'local',
      error: storageError 
    });
  }
  
  res.json({
    providers: storageInstance.listProviders(),
    default: storageInstance.defaultProvider
  });
});

/**
 * POST /api/attachments/:bugId
 * Upload a file to a bug
 */
router.post('/:bugId', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const storageInstance = initStorage();
    if (!storageInstance) {
      return res.status(500).json({ error: 'Storage not available: ' + storageError });
    }

    const { bugId } = req.params;
    let provider = req.body.provider || storageInstance.defaultProvider;
    
    // Verify provider is registered
    const availableProviders = storageInstance.listProviders();
    if (!availableProviders.includes(provider)) {
      console.warn(`[Attachments] Provider '${provider}' not available, falling back to '${availableProviders[0]}'`);
      provider = availableProviders[0];
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log(`[Attachments] Uploading ${req.file.originalname} to ${provider} for bug ${bugId}`);

    // Upload to storage
    const username = req.user?.username || 'system';
    const result = await storageInstance.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: `bugs/${bugId}`,
      metadata: { bugId, uploadedBy: username },
      provider
    });

    // Create attachment record
    const attachment = {
      id: result.id || uuidv4(),
      bugId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath: result.storagePath,
      provider: result.provider || provider,
      url: result.url,
      uploadedBy: username,
      uploadedAt: new Date().toISOString()
    };

    console.log('[Attachments] File uploaded:', attachment.fileName, 'to', attachment.provider);

    // Update bug record with attachment metadata (direct MySQL)
    try {
      const bug = await getBugById(bugId);
      if (bug) {
        const existingAttachments = parseAttachments(bug.attachments);
        existingAttachments.push(attachment);
        const newAttachmentsJson = JSON.stringify(existingAttachments);
        
        const updated = await updateBugAttachments(bugId, newAttachmentsJson);
        if (!updated) {
          console.warn('[Attachments] Database update failed, but file uploaded successfully');
        }
      } else {
        console.warn('[Attachments] Bug not found:', bugId);
      }
    } catch (err) {
      console.error('[Attachments] Could not update bug record:', err.message);
    }

    res.status(201).json(attachment);
    
  } catch (error) {
    console.error('[Attachments] Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/attachments/:bugId
 * List attachments for a bug
 */
router.get('/:bugId', authMiddleware, async (req, res) => {
  try {
    const { bugId } = req.params;
    const bug = await getBugById(bugId);
    
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    res.json({ attachments: parseAttachments(bug.attachments) });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/attachments/download/:provider/*
 * Get URL to open/view attachment
 */
router.get('/download/:provider/*', authMiddleware, async (req, res) => {
  try {
    const storageInstance = initStorage();
    if (!storageInstance) {
      return res.status(500).json({ error: 'Storage not available' });
    }

    const provider = req.params.provider;
    const storagePath = req.params[0];

    if (!storagePath) {
      return res.status(400).json({ error: 'Path required' });
    }

    // Get signed URL (valid for 1 hour)
    const url = await storageInstance.getSignedUrl(storagePath, 3600, provider);
    
    res.json({ 
      url, 
      expiresIn: 3600,
      openInBrowser: true
    });
    
  } catch (error) {
    console.error('[Attachments] Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/attachments/:bugId/:attachmentId
 * Delete an attachment
 */
router.delete('/:bugId/:attachmentId', authMiddleware, async (req, res) => {
  try {
    const storageInstance = initStorage();
    if (!storageInstance) {
      return res.status(500).json({ error: 'Storage not available' });
    }

    const { bugId, attachmentId } = req.params;
    
    const bug = await getBugById(bugId);
    if (!bug) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    const attachments = parseAttachments(bug.attachments);
    const index = attachments.findIndex(a => a.id === attachmentId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = attachments[index];

    // Delete from storage
    try {
      await storageInstance.delete(attachment.storagePath, attachment.provider);
      console.log('[Attachments] Deleted from storage:', attachment.fileName);
    } catch (err) {
      console.error('[Attachments] Storage delete failed:', err.message);
    }

    // Update bug record
    attachments.splice(index, 1);
    const newAttachmentsJson = JSON.stringify(attachments);
    await updateBugAttachments(bugId, newAttachmentsJson);

    res.json({ message: 'Deleted' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Multer error handler
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 25MB)' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

module.exports = router;

