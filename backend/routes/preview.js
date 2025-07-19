const express = require('express');
const router = express.Router();
const { Client, Databases, Query } = require('node-appwrite');
const TelegramBot = require('node-telegram-bot-api');

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
        const filesResponse = await databases.listDocuments(
          process.env.APPWRITE_DB_ID,
          process.env.APPWRITE_FILES_COLLECTION_ID,
          [Query.equal('telegram_file_id', req.params.fileId)]
        );
        
        if (!filesResponse.documents.length) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        const file = filesResponse.documents[0];
        const user = await databases.getDocument(
          process.env.APPWRITE_DB_ID,
          process.env.APPWRITE_USERS_COLLECTION_ID,
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

module.exports = router;