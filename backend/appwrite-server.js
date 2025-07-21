const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const session = require('express-session');
const { Client, Databases, ID, Query } = require('node-appwrite');
const crypto = require('crypto');
require('dotenv').config();

console.log('🚀 Starting Telegram Drive Backend (Appwrite Edition)...');

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
  PORT: 5001,
  TEMP_DIR: path.join(__dirname, 'temp'),
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,
    max: 200
  },
  SYNC: {
    ENABLE_AUTO_SYNC: true,
    SYNC_INTERVAL: 5 * 60 * 1000,
    MAX_MESSAGES_PER_SYNC: 100,
    RETRY_ATTEMPTS: 3
  },
  APPWRITE: {
    ENDPOINT: process.env.APPWRITE_ENDPOINT,
    PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    API_KEY: process.env.APPWRITE_API_KEY,
    DB_ID: process.env.APPWRITE_DB_ID,
    COLLECTIONS: {
      USERS: process.env.APPWRITE_USERS_COLLECTION_ID,
      FILES: process.env.APPWRITE_FILES_COLLECTION_ID,
      BOTS: process.env.APPWRITE_BOTS_COLLECTION_ID
    }
  }
};

// ========================================
// INITIALIZATION
// ========================================
const app = express();
const appwriteClient = new Client()
  .setEndpoint(CONFIG.APPWRITE.ENDPOINT)
  .setProject(CONFIG.APPWRITE.PROJECT_ID)
  .setKey(CONFIG.APPWRITE.API_KEY);

const databases = new Databases(appwriteClient);

if (!fs.existsSync(CONFIG.TEMP_DIR)) {
  fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit(CONFIG.RATE_LIMIT));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: CONFIG.TEMP_DIR,
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: CONFIG.MAX_FILE_SIZE }
});

// ========================================
// HELPER FUNCTIONS (UPDATED)
// ========================================

// Find user by Telegram ID
const findUserByTelegramId = async (telegramId) => {
  try {
    const response = await databases.listDocuments(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.USERS,
      [Query.equal('telegram_id', telegramId.toString())]
    );
    return response.documents[0] || null;
  } catch (error) {
    console.error('❌ Appwrite user search error:', error.message);
    return null;
  }
};

// Generate a valid Appwrite ID (20-char hex)
const generateAppwriteId = () => {
  return crypto.randomBytes(10).toString('hex'); // 20-character hex string
};

// Get bot document directly without query
const getBotDocument = async (botId) => {
  try {
    return await databases.getDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.BOTS,
      botId
    );
  } catch (error) {
    console.error(`❌ Bot fetch error for ID ${botId}:`, error.message);
    throw new Error(`Bot not found: ${botId}`);
  }
};

// Create TelegramBot instance for a user (FIXED)
const getTelegramBotForUser = async (user) => {
  if (!user.assigned_bot) {
    throw new Error('No bot assigned to user');
  }
  
  // Handle both string ID and expanded object
  const botId = user.assigned_bot.$id || user.assigned_bot;
  
  if (!botId || typeof botId !== 'string') {
    throw new Error(`Invalid bot ID: ${botId}`);
  }
  
  const assignedBot = await getBotDocument(botId);
  return new TelegramBot(assignedBot.bot_token, { polling: false });
};

// Cleanup temporary files
const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('⚠️ Failed to cleanup temp file:', error.message);
  }
};

// Build Telegram link
function buildTelegramLink(channel_id, message_id) {
  if (!channel_id || !message_id) return null;
  const id = channel_id.toString().replace('-100', '');
  return `https://t.me/c/${id}/${message_id}`;
}

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Telegram Drive Backend Running with Appwrite!',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: '2.0.0'
  });
});

// User authentication with persistent bot assignment (UPDATED)
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url } = req.body;
    if (!id) return res.status(400).json({ error: 'Telegram ID is required' });

    // Find user by telegram_id
    let user = await findUserByTelegramId(id);
    let isNewUser = false;

    if (!user) {
      // Get all active bots
      const botsResponse = await databases.listDocuments(
        CONFIG.APPWRITE.DB_ID,
        CONFIG.APPWRITE.COLLECTIONS.BOTS,
        [Query.equal('is_active', true)]
      );
      
      if (!botsResponse.documents.length) {
        return res.status(500).json({ error: 'No active bots available' });
      }
      
      // Randomly pick a bot
      const assignedBot = botsResponse.documents[Math.floor(Math.random() * botsResponse.documents.length)];
      
      // Create new user with a valid ID
      user = await databases.createDocument(
        CONFIG.APPWRITE.DB_ID,
        CONFIG.APPWRITE.COLLECTIONS.USERS,
        generateAppwriteId(),
        {
          telegram_id: id.toString(),
          first_name,
          last_name,
          username,
          photo_url,
          assigned_bot: assignedBot.$id, // Store only the ID string
          assigned_bot_username: assignedBot.bot_username,
          storage_used: 0,
          private_channel_id: null,
          channel_setup_complete: false
        }
      );
      
      isNewUser = true;
      console.log(`👤 Created new user with bot: ${assignedBot.$id}`);
    }

    req.session.userId = user.telegram_id;

    res.json({
      success: true,
      user: {
        ...user,
        is_new_user: isNewUser
      }
    });
  } catch (error) {
    console.error('❌ Auth error:', error);
    
    // Handle specific Appwrite errors
    if (error.code === 409) { // Document already exists
      // Retry with a new ID
      return res.status(400).json({ error: 'Please try logging in again' });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Register user private channel
app.post('/api/user/register-channel', async (req, res) => {
  try {
    const { user_id, channel_id } = req.body;
    console.log('📝 Register channel request:', { user_id, channel_id });
    
    if (!user_id || !channel_id) {
      return res.status(400).json({ error: "Missing user_id or channel_id" });
    }
    
    const user = await findUserByTelegramId(user_id);
    if (!user) {
      console.log('❌ User not found for telegram_id:', user_id);
      return res.status(404).json({ error: 'User not found. Please login again.' });
    }
    
    // Update user record
    const updatedUser = await databases.updateDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.USERS,
      user.$id,
      {
        private_channel_id: channel_id,
        channel_setup_complete: true
      }
    );
    
    console.log('✅ Updated user with channel:', updatedUser.$id);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('❌ Register channel error:', error);
    res.status(500).json({ error: 'Failed to register channel: ' + error.message });
  }
});

// Upload file with direct bot access
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { user_id } = req.body;
    
    if (!user_id) {
      cleanupTempFile(req.file.path);
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const user = await findUserByTelegramId(user_id);
    if (!user) {
      cleanupTempFile(req.file.path);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.private_channel_id) {
      cleanupTempFile(req.file.path);
      return res.status(400).json({
        error: 'Private channel not configured',
        setup_required: true,
        message: 'Please set up your private channel first',
        setup_url: `/api/user/channel-setup/${user_id}`
      });
    }

    const tgBot = await getTelegramBotForUser(user);

    console.log(`📤 Uploading ${req.file.originalname} to user ${user_id}'s channel...`);
    const telegramResult = await tgBot.sendDocument(user.private_channel_id, req.file.path, {
      caption: `📁 ${req.file.originalname}\n👤 ${user.first_name || 'User'}\n📊 Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB\n⏰ ${new Date().toISOString()}`
    });
    
    const fileData = {
      user_id: user.$id,
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      telegram_file_id: telegramResult.document.file_id,
      channel_id: user.private_channel_id,
      telegram_message_id: telegramResult.message_id,
      telegram_link: buildTelegramLink(user.private_channel_id, telegramResult.message_id),
      is_deleted: false
    };
    
    const savedFile = await databases.createDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.FILES,
      generateAppwriteId(),
      fileData
    );
    
    // Update user storage
    await databases.updateDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.USERS,
      user.$id,
      {
        storage_used: (user.storage_used || 0) + req.file.size
      }
    );
    
    cleanupTempFile(req.file.path);
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: savedFile.$id,
        name: savedFile.original_name,
        size: savedFile.file_size,
        type: savedFile.mime_type,
        telegram_file_id: savedFile.telegram_file_id,
        upload_date: savedFile.$createdAt
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    cleanupTempFile(req.file?.path);
    
    // Handle specific bot errors
    if (error.message.includes('Bot not found') || error.message.includes('Invalid documentId')) {
      return res.status(500).json({
        error: 'Bot configuration error. Please try logging in again.',
        reauth_required: true
      });
    }
    
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Get user files
app.get('/api/files', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID required' });
    
    const user = await findUserByTelegramId(user_id);
    if (!user) return res.json([]);
    
    const filesResponse = await databases.listDocuments(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.FILES,
      [
        Query.equal('user_id', user.$id),
        Query.equal('is_deleted', false)
      ]
    );
    
    const transformedFiles = filesResponse.documents.map(file => ({
      id: file.$id,
      name: file.original_name,
      size: file.file_size,
      type: file.mime_type,
      uploadedAt: file.$createdAt,
      telegram_file_id: file.telegram_file_id,
      thumbnailUrl: file.mime_type?.startsWith('image/')
        ? `/api/telegram-file/${file.telegram_file_id}`
        : null,
      previewUrl: `/api/telegram-file/${file.telegram_file_id}`,
      telegram_link: file.telegram_link || buildTelegramLink(file.channel_id, file.telegram_message_id)
    }));
    
    res.json(transformedFiles);
  } catch (error) {
    console.error('❌ Files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get current user info
app.get('/api/user/me', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    
    const user = await findUserByTelegramId(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user.$id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      storage_used: user.storage_used || 0,
      private_channel_id: user.private_channel_id || null,
      channel_setup_complete: user.channel_setup_complete || false,
      assigned_bot_username: user.assigned_bot_username
    });
  } catch (error) {
    console.error('❌ /api/user/me error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Download file
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const file = await databases.getDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.FILES,
      req.params.fileId
    );
    
    if (!file || file.is_deleted) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const user = await databases.getDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.USERS,
      file.user_id
    );
    
    const tgBot = await getTelegramBotForUser(user);
    const fileLink = await tgBot.getFileLink(file.telegram_file_id);
    
    const response = await fetch(fileLink);
    if (!response.ok) throw new Error('Failed to fetch from Telegram');
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    response.body.pipe(res);
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Telegram file proxy
app.get('/api/telegram-file/:fileId', async (req, res) => {
  try {
    const filesResponse = await databases.listDocuments(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.FILES,
      [Query.equal('telegram_file_id', req.params.fileId)]
    );
    
    if (!filesResponse.documents.length) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = filesResponse.documents[0];
    const user = await databases.getDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.USERS,
      file.user_id
    );
    
    const tgBot = await getTelegramBotForUser(user);
    const fileInfo = await tgBot.getFile(req.params.fileId);
    
    if (!fileInfo.file_path) {
      return res.status(413).json({ 
        error: 'File is too big to stream via Telegram Bot API (limit is 20MB).' 
      });
    }
    
    const fileUrl = `https://api.telegram.org/file/bot${tgBot.token}/${fileInfo.file_path}`;
    return res.redirect(302, fileUrl);
  } catch (error) {
    console.error('❌ File proxy error:', error);
    res.status(500).json({ error: 'File not available' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ========================================
// STARTUP
// ========================================
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${CONFIG.PORT}`);
  console.log(`💾 Using Appwrite: ${CONFIG.APPWRITE.ENDPOINT}`);
});