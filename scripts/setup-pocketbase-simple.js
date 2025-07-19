const PocketBase = require('pocketbase/cjs');

const pb = new PocketBase('http://127.0.0.1:8090');

const setupPocketBase = async () => {
  try {
    console.log('🚀 Setting up PocketBase...');

    // Login as admin
    await pb.admins.authWithPassword('manishgupta7656@gmail.com', 'Manish@2026');
    console.log('✅ Logged in as admin');

    // Check collections
    const collections = await pb.collections.getFullList();
    const hasUsers = collections.some(c => c.name === 'users');
    const hasFiles = collections.some(c => c.name === 'files');

    console.log('📊 Existing collections:', collections.map(c => c.name).join(', '));

    if (hasUsers && hasFiles) {
      console.log('✅ All required collections exist!');
      
      // Create a test user manually
      try {
        const testUser = await pb.collection('users').create({
          telegram_id: 6648409696,
          first_name: 'Manish',
          last_name: 'Gupta',
          username: '',
          photo_url: '',
          storage_used: 0,
          storage_limit: null, // Unlimited
          email: 'user_6648409696@telegram.local',
          password: 'temp_password_123',
          passwordConfirm: 'temp_password_123'
        });
        console.log('✅ Created test user:', testUser.id);
      } catch (userError) {
        if (userError.message.includes('already exists')) {
          console.log('✅ User already exists');
        } else {
          console.error('❌ User creation failed:', userError.message);
        }
      }

      // Count current records
      const userCount = await pb.collection('users').getList(1, 1);
      const fileCount = await pb.collection('files').getList(1, 1);
      
      console.log(`📊 Current data: ${userCount.totalItems} users, ${fileCount.totalItems} files`);
      
      return true;
    } else {
      console.log('❌ Missing collections:');
      if (!hasUsers) console.log('   - users collection missing');
      if (!hasFiles) console.log('   - files collection missing');
      return false;
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
};

// Test API endpoints
const testEndpoints = async () => {
  try {
    console.log('🔧 Testing PocketBase backend endpoints...');
    
    const testUrl = 'http://localhost:5001/api/test';
    console.log(`Testing: ${testUrl}`);
    
    const fetch = require('node-fetch');
    const response = await fetch(testUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend test successful:', data.message);
    } else {
      console.log('⚠️ Backend test failed:', response.status);
    }
    
  } catch (error) {
    console.log('⚠️ Backend test error:', error.message);
    console.log('💡 Make sure server-pocketbase.js is running on port 5001');
  }
};

const main = async () => {
  console.log('🚀 Starting PocketBase simple setup...');
  
  const success = await setupPocketBase();
  if (success) {
    console.log('🎉 PocketBase setup complete!');
    console.log('🌐 Admin UI: http://127.0.0.1:8090/_/');
    console.log('🚀 Backend: http://localhost:5001/api/test');
    
    await testEndpoints();
    
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Test file upload: http://localhost:5001/api/files?user_id=6648409696');
    console.log('2. Upload a test file via your frontend');
    console.log('3. Check PocketBase admin to see the data');
  }
};

main();