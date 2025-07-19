const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Client, Databases, ID, Query } = require('node-appwrite');
const TelegramBot = require('node-telegram-bot-api');

const TEMP_DIR = path.join(__dirname, '../temp');

const upload = multer({
    storage: multer.diskStorage({
      destination: TEMP_DIR,
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    limits: { fileSize: 50 * 1024 * 1024 }
  });

const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);

const findUserByTelegramId = async (telegramId) => {
    try {
      const response = await databases.listDocuments(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        [Query.equal('telegram_id', telegramId.toString())]
      );
      return response.documents[0] || null;
    } catch (error) {
      console.error('❌ Appwrite user search error:', error.message);
      return null;
    }
  };

const getUserAssignedBot = async (botId) => {
    try {
      return await databases.getDocument(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_BOTS_COLLECTION_ID,
        botId
      );
    } catch (error) {
      throw new Error('Bot not found: ' + error.message);
    }
  };

const getTelegramBotForUser = async (user) => {
    const assignedBot = await getUserAssignedBot(user.assigned_bot);
    return new TelegramBot(assignedBot.bot_token, { polling: false });
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
    const id = channel_id.toString().replace('-100', '');
    return `https://t.me/c/${id}/${message_id}`;
}

router.post('/', upload.single('file'), async (req, res) => {
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
          process.env.APPWRITE_DB_ID,
          process.env.APPWRITE_FILES_COLLECTION_ID,
          ID.unique(),
          fileData
        );
        
        // Update user storage
        await databases.updateDocument(
          process.env.APPWRITE_DB_ID,
          process.env.APPWRITE_USERS_COLLECTION_ID,
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

module.exports = router;