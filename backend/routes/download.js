const express = require('express');
const router = express.Router();
const { Client, Databases, Query } = require('node-appwrite');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);

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

router.get('/:fileId', async (req, res) => {
    try {
      const file = await databases.getDocument(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_FILES_COLLECTION_ID,
        req.params.fileId
      );
      
      if (!file || file.is_deleted) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const user = await databases.getDocument(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
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

module.exports = router;