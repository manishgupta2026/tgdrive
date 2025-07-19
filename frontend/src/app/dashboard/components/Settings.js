'use client';
import { useState, useMemo } from 'react';
import { 
  FiMoon, 
  FiSun, 
  FiBell, 
  FiShield, 
  FiUser, 
  FiSettings, 
  FiInfo, 
  FiTrash2,
  FiDownload,
  FiCheck,
  FiX,
  FiAlertTriangle
} from 'react-icons/fi';
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

export default function Settings({ 
  user, 
  onChannelChanged, 
  showNotification, 
  onLogout 
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [channelId, setChannelId] = useState('');
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [notificationPrefs, setNotificationPrefs] = useState({
    uploads: true,
    channelUpdates: true,
    security: true
  });

  // Generate default avatar URL using DiceBear API
  const defaultAvatarUrl = useMemo(() => {
    const seed = user?.username || user?.telegram_id || 'default';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  }, [user?.username, user?.telegram_id]);

  // Storage quota calculation
  const storageLimit = user?.storage_limit || 0; // 0 means unlimited
  const storageUsed = user?.storage_used || 0;
  const storagePercentage = storageLimit > 0 ? Math.min((storageUsed / storageLimit) * 100, 100) : 0;
  const storageColor = storagePercentage > 90 ? 'bg-red-500' : 
                      storagePercentage > 70 ? 'bg-yellow-500' : 'bg-blue-500';

  // Change Telegram Channel
  const handleChangeChannel = async () => {
    if (!channelId.trim()) {
      setError('Channel ID is required');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.registerChannel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.telegram_id,
          channel_id: channelId
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Channel updated successfully!');
        showNotification('Channel updated!', 'success');
        onChannelChanged?.();
      } else {
        setError(data.error || 'Failed to update channel.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Change Display Name
  const handleChangeDisplayName = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${getBackendUrl()}/api/user/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:  user.telegram_id,
          first_name: displayName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Display name updated successfully!');
        showNotification('Display name updated!', 'success');
      } else {
        setError(data.error || 'Failed to update display name.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Export Data
  const handleExportData = async () => {
    try {
      window.open(`${getBackendUrl()}/api/user/export-data?user_id=${user.id || user.telegram_id}`, '_blank');
      showNotification('Data export started!', 'success');
    } catch (e) {
      showNotification('Failed to export data.', 'error');
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${getBackendUrl()}/api/user/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id || user.telegram_id })
      });
      if (res.ok) {
        showNotification('Account deleted successfully.', 'success');
        onLogout?.();
      } else {
        showNotification('Failed to delete account.', 'error');
      }
    } catch (e) {
      showNotification('Network error.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Toggle Theme
  const handleThemeToggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    showNotification(`Switched to ${newMode ? 'dark' : 'light'} mode`, 'success');
    document.documentElement.classList.toggle('dark', newMode);
  };

  // Update Notification Preferences
  const handleNotificationToggle = (key) => {
    const newPrefs = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key]
    };
    setNotificationPrefs(newPrefs);
    showNotification('Notification preferences updated!', 'success');
    
    // In a real app, you would save these preferences to the backend
    // saveNotificationPrefs(newPrefs);
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-blue-600 text-white shadow-md' 
          : 'hover:bg-slate-700 text-slate-300'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto mt-4 sm:mt-8 space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Profile Summary Card */}
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative">
            <img 
              src={user?.photo_url ||  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name[0] || 'User')}&background=6366f1&color=fff`} 
              alt="Profile" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-blue-500 shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultAvatarUrl;
              }}
            />
            <button
              onClick={handleThemeToggle}
              className="absolute -bottom-1 -right-1 p-2 bg-slate-800 rounded-full border border-slate-700 hover:bg-slate-700 transition-colors shadow-md"
              title="Toggle theme"
            >
              {darkMode ? (
                <FiSun className="w-4 h-4 text-yellow-400" />
              ) : (
                <FiMoon className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
          
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="font-bold text-white text-lg sm:text-xl truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 truncate">
              @{user?.username || 'no-username'} • ID: {user?.telegram_id}
            </div>
            
            {/* Storage Usage Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs sm:text-sm text-slate-400 mb-1">
                <span>
                  Storage: {(storageUsed / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span>
                  {storageLimit > 0 ? `${(storageLimit / (1024 * 1024)).toFixed(0)} MB` : 'Unlimited'}
                </span>
              </div>
              {storageLimit > 0 && (
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${storageColor}`}
                    style={{ width: `${storagePercentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="bg-slate-800 rounded-2xl p-2 sm:p-3 border border-slate-700 shadow-md overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <TabButton id="profile" icon={FiUser} label="Profile" />
          <TabButton id="security" icon={FiShield} label="Security" />
          <TabButton id="preferences" icon={FiSettings} label="Preferences" />
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700 shadow-lg">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Settings</h2>
            
            {/* Display Name */}
            <div>
              <label className="block text-slate-300 mb-2 font-medium">Display Name</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  disabled={loading}
                />
                <button
                  onClick={handleChangeDisplayName}
                  disabled={loading || displayName === user?.first_name}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    loading || displayName === user?.first_name
                      ? 'bg-slate-600 cursor-not-allowed opacity-70' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>

            {/* Channel ID */}
            <div>
              <label className="block text-slate-300 mb-2 font-medium">Telegram Channel ID</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  value={channelId}
                  onChange={e => setChannelId(e.target.value)}
                  placeholder="e.g. -1001234567890"
                  disabled={loading}
                />
                <button
                  onClick={handleChangeChannel}
                  disabled={loading || !channelId}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    loading || !channelId
                      ? 'bg-slate-600 cursor-not-allowed opacity-70' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                This is where your files will be stored. Make sure the bot is an admin in this channel.
              </p>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
              >
                <FiDownload className="w-5 h-5" />
                Export My Data
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
              >
                <FiTrash2 className="w-5 h-5" />
                Delete Account
              </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-2xl p-6 border border-red-600/50 max-w-md w-full shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <FiAlertTriangle className="text-red-500 w-6 h-6" />
                    <h3 className="text-xl font-bold text-white">Delete Account</h3>
                  </div>
                  
                  <p className="text-slate-300 mb-6">
                    This action cannot be undone. All your files and data will be permanently deleted.
                  </p>
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className={`px-4 py-2 flex items-center gap-2 ${
                        deleting ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'
                      } text-white rounded-lg transition-colors`}
                    >
                      {deleting ? (
                        <>
                          <span className="animate-spin">🌀</span>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <FiTrash2 />
                          Confirm Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Notification Preferences</h2>
            
            <div className="space-y-3">
              {Object.entries(notificationPrefs).map(([key, enabled]) => {
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                return (
                  <div 
                    key={key} 
                    className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    onClick={() => handleNotificationToggle(key)}
                  >
                    <div>
                      <div className="text-white capitalize font-medium">{label}</div>
                      <div className="text-xs text-slate-400">
                        {key === 'uploads' && 'Get notified when uploads complete'}
                        {key === 'channelUpdates' && 'Receive channel sync notifications'}
                        {key === 'security' && 'Important security alerts'}
                      </div>
                    </div>
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-blue-600' : 'bg-slate-600'
                    }`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {(error || success) && (
          <div className={`mt-4 p-3 rounded-lg border ${
            error ? 'bg-red-900/50 border-red-700 text-red-400' : 
            'bg-green-900/50 border-green-700 text-green-400'
          }`}>
            <div className="flex items-center gap-2">
              {error ? <FiX className="w-5 h-5" /> : <FiCheck className="w-5 h-5" />}
              <span>{error || success}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}