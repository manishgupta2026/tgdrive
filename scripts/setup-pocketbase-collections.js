const PocketBase = require('pocketbase/cjs');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pb = new PocketBase('http://127.0.0.1:8090');

// Import your MongoDB models
const File = require('../backend/models/File');

const setupPocketBase = async () => {
  try {
    console.log('🚀 Setting up PocketBase collections...');

    // Add your admin credentials here
    await pb.admins.authWithPassword('manishgupta7656@gmail.com', 'Manish@2026');
    console.log('✅ Logged in as admin');

    // Check if collections exist
    const collections = await pb.collections.getFullList();
    const hasUsers = collections.some(c => c.name === 'users');
    const hasFiles = collections.some(c => c.name === 'files');

    console.log('📊 Existing collections:', collections.map(c => c.name).join(', '));

    if (hasUsers && hasFiles) {
      console.log('✅ All required collections exist! Ready for migration.');
      return true;
    } else {
      console.log('❌ Missing collections:');
      if (!hasUsers) console.log('   - users collection missing');
      if (!hasFiles) console.log('   - files collection missing');
      return false;
    }

  } catch (error) {
    console.error('❌ PocketBase setup failed:', error);
    return false;
  }
};

const migrateData = async () => {
  try {
    console.log('🔄 Starting data migration from MongoDB to PocketBase...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all files from MongoDB
    const mongoFiles = await File.find({});
    console.log(`📊 Found ${mongoFiles.length} files in MongoDB`);

    if (mongoFiles.length === 0) {
      console.log('ℹ️ No files to migrate');
      return { migratedCount: 0, errorCount: 0 };
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(mongoFiles.map(f => f.user_id))];
    console.log(`👥 Unique user IDs: ${uniqueUserIds.join(', ')}`);

    const userMapping = {};

    // Create users in PocketBase
    for (const telegramId of uniqueUserIds) {
      try {
        // Check if user exists
        const existingUsers = await pb.collection('users').getList(1, 1, {
          filter: `telegram_id = ${telegramId}`
        });

        let pbUser;
        if (existingUsers.items.length > 0) {
          pbUser = existingUsers.items[0];
          console.log(`✅ Found existing user: ${telegramId}`);
        } else {
          // Create user with minimal required fields
          const password = `temp_${telegramId}_${Date.now()}`;
          const userData = {
            telegram_id: telegramId,
            first_name: `User ${telegramId}`,
            last_name: '',
            username: '',
            photo_url: '',
            storage_used: 0,
            storage_limit: null, // Unlimited storage via Telegram!
            email: `user_${telegramId}@telegram.local`,
            password: password,
            passwordConfirm: password
          };

          pbUser = await pb.collection('users').create(userData);
          console.log(`✅ Created new user: ${telegramId} -> ${pbUser.id}`);
        }

        userMapping[telegramId] = pbUser.id;

      } catch (userError) {
        console.error(`❌ User creation failed for ${telegramId}:`, userError.message);
      }
    }

    // Migrate files
    let migratedCount = 0;
    let errorCount = 0;

    for (const mongoFile of mongoFiles) {
      try {
        const pbUserId = userMapping[mongoFile.user_id];
        if (!pbUserId) {
          console.warn(`⚠️ No PocketBase user for MongoDB user ${mongoFile.user_id}`);
          errorCount++;
          continue;
        }

        const fileData = {
          user: pbUserId,
          original_name: mongoFile.original_name,
          file_size: mongoFile.file_size,
          mime_type: mongoFile.mime_type || 'application/octet-stream',
          telegram_file_id: mongoFile.telegram_file_id,
          channel_id: mongoFile.channel_id || '',
          telegram_message_id: mongoFile.telegram_message_id || 0,
          is_deleted: mongoFile.is_deleted || false,
          folder_path: mongoFile.folder_path || '/',
          tags: mongoFile.tags || []
        };

        await pb.collection('files').create(fileData);
        migratedCount++;
        console.log(`✅ Migrated: ${mongoFile.original_name}`);

      } catch (fileError) {
        console.error(`❌ File migration failed for ${mongoFile.original_name}:`, fileError.message);
        errorCount++;
      }
    }

    console.log(`🎉 Migration complete!`);
    console.log(`✅ Migrated: ${migratedCount} files`);
    console.log(`❌ Errors: ${errorCount} files`);

    return { migratedCount, errorCount };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return null;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Starting PocketBase setup and migration...');

  // Setup and check collections
  const setupSuccess = await setupPocketBase();
  if (!setupSuccess) {
    console.log('❌ Setup failed, stopping migration');
    return;
  }

  // Migrate data
  const migrationResult = await migrateData();
  if (migrationResult) {
    console.log(`🎉 Setup and migration complete!`);
    console.log(`📊 Files migrated: ${migrationResult.migratedCount}`);
    console.log(`❌ Errors: ${migrationResult.errorCount}`);
    console.log(`🌐 PocketBase Admin: http://127.0.0.1:8090/_/`);
    console.log(`🚀 Backend running: http://localhost:5001/api/test`);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { setupPocketBase, migrateData };