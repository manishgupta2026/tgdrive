
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
  ENDPOINTS: {
    test: '/api/test',
    auth: '/api/auth/telegram',
    files: '/api/files',
    upload: '/api/upload',
    download: '/api/download',
    user: '/api/user/me',
    registerChannel: '/api/user/register-channel',
    syncChannel: '/api/user/sync-channel',
    storageInfo: '/api/storage/info',
    botUsernames: '/api/bots/usernames',
    logout: '/api/logout',
  }
};

export default API_CONFIG;
