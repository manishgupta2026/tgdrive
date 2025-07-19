const express = require('express');
const router = express.Router();
const { Client, Databases, ID, Query } = require('node-appwrite');

const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwriteClient);

router.post('/telegram', async (req, res) => {
  try {
    const { id, first_name, last_name, username, photo_url } = req.body;
    if (!id) return res.status(400).json({ error: 'Telegram ID is required' });

    // Find user by telegram_id
    let user = await databases.listDocuments(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        [Query.equal('telegram_id', id.toString())]
    ).then(response => response.documents[0]);

    // Bot assignment logic
    let assignedBot;
    if (!user || !user.assigned_bot) {
      // Get all active bots
      const botsResponse = await databases.listDocuments(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_BOTS_COLLECTION_ID,
        [Query.equal('is_active', true)]
      );
      
      if (!botsResponse.documents.length) {
        return res.status(500).json({ error: 'No active bots available' });
      }
      
      // Randomly pick a bot
      assignedBot = botsResponse.documents[Math.floor(Math.random() * botsResponse.documents.length)];
    } else {
        assignedBot = await databases.getDocument(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_BOTS_COLLECTION_ID,
            user.assigned_bot
        );
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
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
        user.$id,
        userData
      );
    } else {
      user = await databases.createDocument(
        process.env.APPWRITE_DB_ID,
        process.env.APPWRITE_USERS_COLLECTION_ID,
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

module.exports = router;