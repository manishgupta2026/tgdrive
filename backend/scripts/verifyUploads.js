const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const File = require('../models/File');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function verifyUploads() {
  const files = await File.find().limit(10);
  
  for (const file of files) {
    console.log(`Verifying file: ${file.original_name} (${file._id})`);
    
    try {
      // Check if file exists in Telegram
      const fileInfo = await bot.telegram.getFile(file.telegram_file_id);
      console.log(`  ✅ File exists: ${fileInfo.file_path}`);
      
      // Try to fetch file content
      const fileStream = await bot.telegram.getFileStream(file.telegram_file_id);
      let byteCount = 0;
      
      fileStream.on('data', (chunk) => byteCount += chunk.length);
      fileStream.on('end', () => {
        console.log(`  📦 File size: ${byteCount} bytes (Expected: ${file.size})`);
      });
      
      // Wait for stream to finish
      await new Promise(resolve => fileStream.on('end', resolve));
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  mongoose.disconnect();
}

verifyUploads();