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
// MIDDLEWARE (Unchanged from original)
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
// HELPER FUNCTIONS (Appwrite Version)
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

// Get assigned bot for a user
const getUserAssignedBot = async (botId) => {
  try {
    return await databases.getDocument(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.BOTS,
      botId
    );
  } catch (error) {
    throw new Error('Bot not found: ' + error.message);
  }
};

// Create TelegramBot instance for a user
const getTelegramBotForUser = async (user) => {
  const assignedBot = await getUserAssignedBot(user.assigned_bot);
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
// ROUTES (Appwrite Version)
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

// User authentication & bot assignment
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url } = req.body;
    if (!id) return res.status(400).json({ error: 'Telegram ID is required' });

    // Find user by telegram_id
    let user = await findUserByTelegramId(id);

    // Bot assignment logic
    let assignedBot;
    if (!user || !user.assigned_bot) {
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
      assignedBot = botsResponse.documents[Math.floor(Math.random() * botsResponse.documents.length)];
    } else {
      assignedBot = await getUserAssignedBot(user.assigned_bot);
    }

    // User data structure
    const userData = {
      telegram_id: id.toString(),
      first_name,
      last_name,
      username,
      photo_url,
      assigned_bot: assignedBot.$id,
      assigned_bot_username: assignedBot.bot_username,
      storage_used: user?.storage_used || 0,
      private_channel_id: user?.private_channel_id || null,
      channel_setup_complete: user?.channel_setup_complete || false
    };

    // Update or create user
    if (user) {
      user = await databases.updateDocument(
        CONFIG.APPWRITE.DB_ID,
        CONFIG.APPWRITE.COLLECTIONS.USERS,
        user.$id,
        userData
      );
    } else {
      user = await databases.createDocument(
        CONFIG.APPWRITE.DB_ID,
        CONFIG.APPWRITE.COLLECTIONS.USERS,
        ID.unique(),
        userData
      );
    }

    req.session.userId = user.telegram_id;

    res.json({
      success: true,
      user: {
        ...user,
        assigned_bot_username: assignedBot.bot_username
      }
    });
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
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

// Upload file
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
      ID.unique(),
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
    res.status(500).json({ error: 'Upload failed' });
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

// Storage info
app.get('/api/storage/info/:userId', async (req, res) => {
  try {
    const user = await findUserByTelegramId(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      user_id: req.params.userId,
      storage: {
        used: user.storage_used || 0,
        used_gb: (user.storage_used / (1024 * 1024 * 1024)).toFixed(2),
        limit: null,
        limit_text: 'Unlimited',
        provider: 'Telegram'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Get current user info
app.get('/api/user/me', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    
    const user = await findUserByTelegramId(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get bot username
    let assigned_bot_username = user.assigned_bot_username;
    if (!assigned_bot_username && user.assigned_bot) {
      const bot = await getUserAssignedBot(user.assigned_bot);
      assigned_bot_username = bot.bot_username;
    }
    
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
      assigned_bot_username
    });
  } catch (error) {
    console.error('❌ /api/user/me error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Get all active bot usernames
app.get('/api/bots/usernames', async (req, res) => {
  try {
    const botsResponse = await databases.listDocuments(
      CONFIG.APPWRITE.DB_ID,
      CONFIG.APPWRITE.COLLECTIONS.BOTS,
      [Query.equal('is_active', true)]
    );
    
    const usernames = botsResponse.documents.map(bot => bot.bot_username);
    res.json({ usernames });
  } catch (error) {
    console.error('❌ /api/bots/usernames error:', error);
    res.status(500).json({ error: 'Failed to fetch bot usernames' });
  }
});

// Manual user sync
app.post('/api/user/sync-channel/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.body;
    
    // Implementation similar to original but using Appwrite
    // (Would require the same sync logic but with Appwrite DB calls)
    
    res.json({
      success: true,
      message: 'Sync initiated (implementation would go here)'
    });
  } catch (error) {
    console.error('❌ User channel sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// STARTUP
// ========================================
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${CONFIG.PORT}`);
  console.log(`💾 Using Appwrite: ${CONFIG.APPWRITE.ENDPOINT}`);
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