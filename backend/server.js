const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PocketBase = require('pocketbase/cjs');
const TelegramBot = require('node-telegram-bot-api');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const session = require('express-session');
require('dotenv').config();

console.log('🚀 Starting Telegram Drive Backend...');

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  PORT: 5001,
  POCKETBASE_URL: 'http://127.0.0.1:8090',
  TEMP_DIR: path.join(__dirname, 'temp'),
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,
    max: 200
  },
  SYNC: {
    ENABLE_AUTO_SYNC: true,
    SYNC_INTERVAL: 5 * 60 * 1000, // 5 minute
    MAX_MESSAGES_PER_SYNC: 100,
    RETRY_ATTEMPTS: 3
  }
};

// ========================================
// INITIALIZATION
// ========================================

const pb = new PocketBase(CONFIG.POCKETBASE_URL);
const app = express();

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
    secure: false, // Set to true if using HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
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
// HELPER FUNCTIONS
// ========================================

const authenticatePocketBase = async () => {
  try {
    if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
      await pb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.POCKETBASE_ADMIN_PASSWORD
      );
      console.log('✅ PocketBase authenticated');
    }
  } catch (error) {
    console.error('❌ PocketBase authentication failed:', error.message);
  }
};

const findUserByTelegramId = async (telegramId) => {
  try {
    const telegramIdStr = telegramId.toString();
    const users = await pb.collection('users').getList(1, 1, {
      filter: `telegram_id = "${telegramIdStr}"`
    });
    if (users.items.length > 0) return users.items[0];
    const emailUsers = await pb.collection('users').getList(1, 1, {
      filter: `email = "user_${telegramIdStr}@telegram.local"`
    });
    return emailUsers.items.length > 0 ? emailUsers.items[0] : null;
  } catch (error) {
    console.error('❌ Error finding user:', error.message);
    return null;
  }
};

const ensureCollections = async () => {
  try {
    await pb.collections.getOne('users');
    await pb.collections.getOne('files');
    await pb.collections.getOne('bots');
    console.log('✅ Collections verified');
  } catch (error) {
    console.error('❌ Collections missing. Create them in PocketBase admin.');
  }
};

const cleanupTempFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('⚠️ Failed to cleanup temp file:', error.message);
  }
};

function buildTelegramLink(channel_id, message_id) {
  if (!channel_id || !message_id) return null;
  // Remove -100 prefix for private channels
  const id = channel_id.toString().replace('-100', '');
  return `https://t.me/c/${id}/${message_id}`;
}

// Helper: Get assigned bot for a user
const getUserAssignedBot = async (user) => {
  if (!user.assigned_bot) throw new Error('No bot assigned to user');
  return await pb.collection('bots').getOne(user.assigned_bot);
};

// Helper: Create TelegramBot instance for a user
const getTelegramBotForUser = async (user) => {
  const assignedBot = await getUserAssignedBot(user);
  return new TelegramBot(assignedBot.bot_token, { polling: false });
};

// ========================================
// ROUTES
// ========================================

// Health check
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Telegram Drive Backend Running!',
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
    let user = await pb.collection('users').getFirstListItem(`telegram_id="${id}"`).catch(() => null);

    // --- BOT ASSIGNMENT LOGIC ---
    let assignedBot;
    if (!user || !user.assigned_bot) {
      // Get all active bots
      const bots = await pb.collection('bots').getFullList({ filter: 'is_active=true' });
      if (!bots.length) return res.status(500).json({ error: 'No active bots available' });
      // Randomly pick a bot
      assignedBot = bots[Math.floor(Math.random() * bots.length)];
    } else {
      assignedBot = await pb.collection('bots').getOne(user.assigned_bot);
    }

    // Update or create user with assigned bot
    if (user) {
      user = await pb.collection('users').update(user.id, {
        first_name, last_name, username, photo_url,
        assigned_bot: assignedBot.id,
        assigned_bot_username: assignedBot.bot_username
      });
    } else {
      user = await pb.collection('users').create({
        telegram_id: id,
        first_name, last_name, username, photo_url,
        assigned_bot: assignedBot.id,
        assigned_bot_username: assignedBot.bot_username
      });
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

// Get user files (all, no pagination)
app.get('/api/files', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID required' });
    const user = await findUserByTelegramId(user_id);
    if (!user) return res.json([]);
    const files = await pb.collection('files').getFullList({
      filter: `user = "${user.id}" && is_deleted = false`,
      sort: '-created'
    });
    const transformedFiles = files.map(file => ({
      id: file.id,
      name: file.original_name,
      size: file.file_size,
      type: file.mime_type,
      uploadedAt: file.created,
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

// Upload file (uses assigned bot)
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

    // Use assigned bot for this user
    const tgBot = await getTelegramBotForUser(user);

    console.log(`📤 Uploading ${req.file.originalname} to user ${user_id}'s channel...`);
    const telegramResult = await tgBot.sendDocument(user.private_channel_id, req.file.path, {
      caption: `📁 ${req.file.originalname}\n👤 ${user.first_name || 'User'}\n📊 Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB\n⏰ ${new Date().toISOString()}`
    });
    const fileData = {
      user: user.id,
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      telegram_file_id: telegramResult.document.file_id,
      channel_id: user.private_channel_id,
      telegram_message_id: telegramResult.message_id,
      telegram_link: buildTelegramLink(user.private_channel_id, telegramResult.message_id),
      is_deleted: false,
      folder_path: '/'
    };
    const savedFile = await pb.collection('files').create(fileData);
    await pb.collection('users').update(user.id, {
      storage_used: (user.storage_used || 0) + req.file.size
    });
    cleanupTempFile(req.file.path);
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: savedFile.id,
        name: savedFile.original_name,
        size: savedFile.file_size,
        type: savedFile.mime_type,
        telegram_file_id: savedFile.telegram_file_id,
        upload_date: savedFile.created
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    cleanupTempFile(req.file?.path);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Download file (uses assigned bot)
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const file = await pb.collection('files').getOne(req.params.fileId);
    if (!file || file.is_deleted) return res.status(404).json({ error: 'File not found' });

    // Find user and use their assigned bot
    const user = await pb.collection('users').getOne(file.user);
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

// Telegram file proxy (uses assigned bot)
app.get('/api/telegram-file/:fileId', async (req, res) => {
  try {
    // Find file and user
    const file = await pb.collection('files').getFirstListItem(`telegram_file_id="${req.params.fileId}"`);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const user = await pb.collection('users').getOne(file.user);
    const tgBot = await getTelegramBotForUser(user);

    const fileInfo = await tgBot.getFile(req.params.fileId);
    if (!fileInfo.file_path) {
      return res.status(413).json({ error: 'File is too big to stream via Telegram Bot API (limit is 20MB).' });
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
    const storageUsed = user.storage_used || 0;
    res.json({
      user_id: req.params.userId,
      storage: {
        used: storageUsed,
        used_gb: (storageUsed / (1024 * 1024 * 1024)).toFixed(2),
        limit: null,
        limit_text: 'Unlimited',
        provider: 'Telegram'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual user sync (uses assigned bot)
app.post('/api/user/sync-channel/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.body;
    const result = await syncUserChannel(userId, limit || 50);
    res.json({
      success: result.success,
      message: result.success ? 'User channel synced successfully' : 'Sync failed',
      stats: result.stats || null,
      error: result.error || null
    });
  } catch (error) {
    console.error('❌ User channel sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.post('/api/user/update-profile', async (req, res) => {
  try {
    const { user_id, first_name, last_name } = req.body;
    if (!user_id) return res.status(400).json({ error: 'User ID required' });
    const user = await findUserByTelegramId(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await pb.collection('users').update(user.id, {
      first_name: first_name ?? user.first_name,
      last_name: last_name ?? user.last_name,
    });

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Register user private channel
app.post('/api/user/register-channel', async (req, res) => {
  try {
    const { user_id, channel_id } = req.body;
    console.log('📝 Register channel request:', { user_id, channel_id, type: typeof user_id });
    
    if (!user_id || !channel_id) {
      return res.status(400).json({ error: "Missing user_id or channel_id" });
    }

    // Debug: List all users to see what's in the database
    console.log('🔍 Searching for user with telegram_id:', user_id);
    
    // Try multiple approaches to find the user
    let user = null;
    
    // Approach 1: Direct telegram_id match
    try {
      const users1 = await pb.collection('users').getList(1, 50, {
        filter: `telegram_id = "${user_id}"`
      });
      console.log('🔍 Approach 1 - Direct match results:', users1.items.length);
      if (users1.items.length > 0) {
        user = users1.items[0];
        console.log('✅ Found user via direct match:', user.telegram_id, user.first_name);
      }
    } catch (e) {
      console.log('❌ Approach 1 failed:', e.message);
    }
    
    // Approach 2: String conversion
    if (!user) {
      try {
        const users2 = await pb.collection('users').getList(1, 50, {
          filter: `telegram_id = "${user_id.toString()}"`
        });
        console.log('🔍 Approach 2 - String conversion results:', users2.items.length);
        if (users2.items.length > 0) {
          user = users2.items[0];
          console.log('✅ Found user via string conversion:', user.telegram_id, user.first_name);
        }
      } catch (e) {
        console.log('❌ Approach 2 failed:', e.message);
      }
    }
    
    // Approach 3: List all users and find manually
    if (!user) {
      try {
        const allUsers = await pb.collection('users').getList(1, 50);
        console.log('🔍 All users in database:');
        allUsers.items.forEach(u => {
          console.log(`  - ID: ${u.telegram_id} (${typeof u.telegram_id}), Name: ${u.first_name}`);
        });
        
        user = allUsers.items.find(u => 
          u.telegram_id == user_id || 
          u.telegram_id === user_id.toString() ||
          u.telegram_id === parseInt(user_id)
        );
        
        if (user) {
          console.log('✅ Found user via manual search:', user.telegram_id, user.first_name);
        }
      } catch (e) {
        console.log('❌ Approach 3 failed:', e.message);
      }
    }

    if (!user) {
      console.log('❌ User not found for telegram_id:', user_id);
      console.log('❌ Tried all approaches, user does not exist in database');
      return res.status(404).json({ error: 'User not found. Please login again.' });
    }

    console.log('✅ Found user:', user.id, user.first_name);

    // Update user record
    const updated = await pb.collection('users').update(user.id, {
      private_channel_id: channel_id,
      channel_setup_complete: true,
    });

    console.log('✅ Updated user with channel:', updated.id);

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('❌ Register channel error:', error);
    res.status(500).json({ error: 'Failed to register channel: ' + error.message });
  }
});

// Get current user info (by telegram_id or session/cookie in a real app)
app.get('/api/user/me', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await findUserByTelegramId(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch assigned bot username for display
    let assigned_bot_username = user.assigned_bot_username;
    if (!assigned_bot_username && user.assigned_bot) {
      const assignedBot = await pb.collection('bots').getOne(user.assigned_bot);
      assigned_bot_username = assignedBot.bot_username;
    }

    res.json({
      id: user.id,
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      storage_used: user.storage_used || 0,
      email: user.email,
      private_channel_id: user.private_channel_id || null,
      channel_setup_complete: user.channel_setup_complete || false,
      channel_title: user.channel_title || null,
      assigned_bot_username // <-- include this for frontend
    });
  } catch (error) {
    console.error('❌ /api/user/me error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// Get all active bot usernames
app.get('/api/bots/usernames', async (req, res) => {
  try {
    const bots = await pb.collection('bots').getFullList({ filter: 'is_active=true' });
    const usernames = bots.map(bot => bot.bot_username);
    res.json({ usernames });
  } catch (error) {
    console.error('❌ /api/bots/usernames error:', error);
    res.status(500).json({ error: 'Failed to fetch bot usernames' });
  }
});

// ========================================
// CHANNEL SYNC FUNCTIONS
// ========================================

let botInstances = {}; // Cache bot instances by bot token

const getTelegramBotInstance = (botToken) => {
  if (!botInstances[botToken]) {
    const TelegramBot = require('node-telegram-bot-api');
    botInstances[botToken] = new TelegramBot(botToken, { polling: false });
  }
  return botInstances[botToken];
};

const parseFileFromMessage = (message) => {
  try {
    const caption = message.caption || '';
    const baseData = {
      telegram_message_id: message.message_id,
      channel_id: message.chat?.id?.toString(),
      upload_date: new Date(message.date * 1000),
      caption: caption
    };
    if (message.document) {
      const document = message.document;
      return {
        ...baseData,
        telegram_file_id: document.file_id,
        original_name: document.file_name || 'unknown_document',
        file_size: document.file_size || 0,
        mime_type: document.mime_type || 'application/octet-stream'
      };
    }
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1];
      return {
        ...baseData,
        telegram_file_id: photo.file_id,
        original_name: `photo_${message.message_id}.jpg`,
        file_size: photo.file_size || 0,
        mime_type: 'image/jpeg'
      };
    }
    if (message.video) {
      const video = message.video;
      return {
        ...baseData,
        telegram_file_id: video.file_id,
        original_name: video.file_name || `video_${message.message_id}.mp4`,
        file_size: video.file_size || 0,
        mime_type: video.mime_type || 'video/mp4'
      };
    }
    if (message.audio) {
      const audio = message.audio;
      const fileName = audio.file_name ||
        (audio.title ? `${audio.title}.mp3` : `audio_${message.message_id}.mp3`);
      return {
        ...baseData,
        telegram_file_id: audio.file_id,
        original_name: fileName,
        file_size: audio.file_size || 0,
        mime_type: audio.mime_type || 'audio/mpeg'
      };
    }
    if (message.voice) {
      const voice = message.voice;
      return {
        ...baseData,
        telegram_file_id: voice.file_id,
        original_name: `voice_${message.message_id}.ogg`,
        file_size: voice.file_size || 0,
        mime_type: 'audio/ogg'
      };
    }
    if (message.video_note) {
      const videoNote = message.video_note;
      return {
        ...baseData,
        telegram_file_id: videoNote.file_id,
        original_name: `video_note_${message.message_id}.mp4`,
        file_size: videoNote.file_size || 0,
        mime_type: 'video/mp4'
      };
    }
    if (message.sticker) {
      const sticker = message.sticker;
      const ext = sticker.is_animated ? 'tgs' : 'webp';
      return {
        ...baseData,
        telegram_file_id: sticker.file_id,
        original_name: `sticker_${message.message_id}.${ext}`,
        file_size: sticker.file_size || 0,
        mime_type: sticker.is_animated ? 'application/x-tgsticker' : 'image/webp'
      };
    }
    if (message.animation) {
      const animation = message.animation;
      return {
        ...baseData,
        telegram_file_id: animation.file_id,
        original_name: animation.file_name || `animation_${message.message_id}.gif`,
        file_size: animation.file_size || 0,
        mime_type: animation.mime_type || 'image/gif'
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    return null;
  }
};

const saveChannelFileToDatabase = async (fileData, userId) => {
  try {
    const existingFiles = await pb.collection('files').getList(1, 1, {
      filter: `telegram_file_id = "${fileData.telegram_file_id}"`
    });
    if (existingFiles.items.length > 0) {
      console.log(`📄 File already exists: ${fileData.original_name}`);
      return existingFiles.items[0];
    }
    const newFileData = {
      user: userId,
      original_name: fileData.original_name,
      file_size: fileData.file_size,
      mime_type: fileData.mime_type,
      telegram_file_id: fileData.telegram_file_id,
      channel_id: fileData.channel_id,
      telegram_message_id: fileData.telegram_message_id,
      telegram_link: buildTelegramLink(fileData.channel_id, fileData.telegram_message_id),
      is_deleted: false,
      folder_path: '/'
    };
    const savedFile = await pb.collection('files').create(newFileData);
    const user = await pb.collection('users').getOne(userId);
    await pb.collection('users').update(userId, {
      storage_used: (user.storage_used || 0) + fileData.file_size
    });
    console.log(`✅ Synced file: ${fileData.original_name} (${(fileData.file_size / 1024 / 1024).toFixed(2)} MB)`);
    return savedFile;
  } catch (error) {
    console.error('❌ Error saving channel file:', error);
    return null;
  }
};

const syncSpecificChannel = async (channelId, userId, botToken, limit = 50) => {
  try {
    const tgBot = getTelegramBotInstance(botToken);
    const updates = await tgBot.getUpdates({
      limit: Math.min(limit, 100),
      timeout: 3
    });
    const channelMessages = updates.filter(update => {
      const message = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
      if (!message) return false;
      const chatId = message.chat?.id?.toString();
      const hasAnyFile = !!(message.document || message.photo || message.video ||
        message.audio || message.voice || message.video_note ||
        message.sticker || message.animation);
      return chatId === channelId && hasAnyFile;
    });
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const update of channelMessages) {
      try {
        const message = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
        const fileData = parseFileFromMessage(message);
        if (fileData) {
          const savedFile = await saveChannelFileToDatabase(fileData, userId);
          if (savedFile) syncedCount++;
          else skippedCount++;
        } else {
          errorCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (fileError) {
        errorCount++;
      }
    }
    return {
      success: true,
      stats: {
        channel_id: channelId,
        total_messages: channelMessages.length,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount
      }
    };
  } catch (error) {
    console.error('❌ Error syncing specific channel:', error);
    return { success: false, error: error.message };
  }
};

async function syncUserChannel(userId, limit = 50) {
  try {
    // Find user by telegram_id first
    const user = await pb.collection('users').getFirstListItem(`telegram_id="${userId}"`).catch(() => null);
    if (!user || !user.private_channel_id) {
      return { success: false, error: 'User channel not configured or user not found' };
    }
    const assignedBot = await pb.collection('bots').getOne(user.assigned_bot);
    if (!assignedBot) {
      return { success: false, error: 'User has no assigned bot' };
    }
    const result = await syncSpecificChannel(user.private_channel_id, user.id, assignedBot.bot_token, limit);
    return result;
  } catch (error) {
    console.error('❌ Error syncing user channel:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// STARTUP & SCHEDULED SYNC
// ========================================

const startServer = async () => {
  try {
    await authenticatePocketBase();
    await ensureCollections();
    app.listen(CONFIG.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${CONFIG.PORT}`);
      console.log(`🗄️ PocketBase Admin: http://127.0.0.1:8090/_/`);
      console.log(`🔄 Real-time sync: ${CONFIG.SYNC.ENABLE_AUTO_SYNC ? 'Enabled' : 'Disabled'}`);
    });
    // Scheduled sync logic (if needed)
  } catch (error) {
    console.error('❌ Server startup error:', error);
  }
};

startServer();

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Default cookie name for express-session
    res.json({ success: true, message: 'Logged out successfully' });
  });
});