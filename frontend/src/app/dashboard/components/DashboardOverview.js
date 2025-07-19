'use client';
import { useState, useEffect, useMemo } from 'react';
import ChannelSync from './ChannelSync';
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

export default function DashboardOverview({ 
  user, 
  files, 
  formatFileSize, 
  showNotification,
  onViewChange,
  loadFiles,
  setUser
}) {
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    photos: 0,
    videos: 0,
    documents: 0,
    recentUploads: []
  });

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState("");

  useEffect(() => {
    calculateStats();
  }, [files]);

  // useEffect(() => {
  //   if (user && user.channel_setup_complete === false) {
  //     setShowChannelModal(true);
  //   }
  // }, [user]);

  const calculateStats = () => {
    const photos = files.filter(f => f.type?.startsWith('image/'));
    const videos = files.filter(f => f.type?.startsWith('video/'));
    const documents = files.filter(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/'));
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const recentUploads = [...files]
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 5);

    setStats({
      totalFiles: files.length,
      totalSize,
      photos: photos.length,
      videos: videos.length,
      documents: documents.length,
      recentUploads
    });
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.startsWith('video/')) return '🎥';
    if (type?.startsWith('audio/')) return '🎵';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('zip') || type?.includes('rar')) return '📦';
    if (type?.includes('word') || type?.includes('doc')) return '📝';
    if (type?.includes('excel') || type?.includes('sheet')) return '📊';
    return '📄';
  };

  const quickActions = [
    {
      id: 'upload',
      label: 'Upload Files',
      icon: '📤',
      color: 'bg-gradient-to-br from-blue-600 to-indigo-600',
      action: () => {
        const event = new CustomEvent('showUploadModal');
        window.dispatchEvent(event);
      }
    },
    {
      id: 'photos',
      label: 'View Photos',
      icon: '📷',
      color: 'bg-gradient-to-br from-green-600 to-teal-600',
      action: () => onViewChange('photos')
    },
    {
      id: 'videos',
      label: 'View Videos',
      icon: '🎥',
      color: 'bg-gradient-to-br from-purple-600 to-violet-600',
      action: () => onViewChange('videos')
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: '📄',
      color: 'bg-gradient-to-br from-amber-600 to-orange-600',
      action: () => onViewChange('documents')
    }
  ];
   const defaultAvatarUrl = useMemo(() => {
      const seed = user?.username || user?.telegram_id || 'default';
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    }, [user?.username, user?.telegram_id]);


  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome back, <span className="text-indigo-200">{user?.first_name}</span>! 👋
            </h1>
            <p className="text-blue-100 text-sm md:text-base max-w-2xl">
              Your personal cloud storage dashboard. All your files are securely stored with unlimited space.
            </p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl">
          <img 
              src={user?.photo_url ||  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name[0] || 'User')}&background=6366f1&color=fff`} 
              alt="" 
              className="w-20 h-20 sm:w-20 sm:h-20 rounded-full border-2 border-blue-500 shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =  `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name || 'User')}&background=6366f1&color=fff`;
              }}
            />
            {/* {user?.photo_url || '👤'} */}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">
              📁
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalFiles}</p>
              <p className="text-xs text-slate-400">Total Files</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">
              📷
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.photos}</p>
              <p className="text-xs text-slate-400">Photos</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">
              🎥
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.videos}</p>
              <p className="text-xs text-slate-400">Videos</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">
              📄
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.documents}</p>
              <p className="text-xs text-slate-400">Documents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className={`${action.color} text-white rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg flex flex-col items-center justify-center`}
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="text-sm font-medium">{action.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Storage Status */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Unlimited Storage</h3>
              <p className="text-slate-400 text-sm">All your files safe in the cloud</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Files Stored:</span>
              <span className="text-white font-medium">{stats.totalFiles}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Storage Used:</span>
              <span className="text-emerald-400 font-medium">
                {formatFileSize(stats.totalSize)}
              </span>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-xl p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="text-lg">🚀</span>
                <span className="font-medium">Telegram Cloud Storage</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Your files are securely stored with unlimited space
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Files */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Files</h3>
            <button 
              onClick={() => onViewChange('recent')}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-blue-400 py-1 px-3 rounded-lg transition-colors"
            >
              View All →
            </button>
          </div>
          
          <div className="space-y-3">
            {stats.recentUploads.length > 0 ? (
              stats.recentUploads.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  <div className="text-2xl p-2 bg-slate-800 rounded-lg flex items-center justify-center w-12 h-12 overflow-hidden">
                    {file.type?.startsWith('image/') && file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="object-cover w-10 h-10 rounded"
                      />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    <p className="text-slate-400 text-xs">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.download}/${file.telegram_file_id}`, '_blank')}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                    title="Download"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-5xl mb-3 text-slate-500">📂</div>
                <p className="text-slate-400">No files uploaded yet</p>
                <p className="text-sm text-slate-500 mt-1">Upload your first file to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* File Categories */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">File Categories</h3>
          
          <div className="space-y-4">
            <div 
              onClick={() => onViewChange('photos')}
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  📷
                </div>
                <div>
                  <p className="text-white font-medium">Photos</p>
                  <p className="text-slate-400 text-sm">{stats.photos} files</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                View →
              </button>
            </div>

            <div 
              onClick={() => onViewChange('videos')}
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  🎥
                </div>
                <div>
                  <p className="text-white font-medium">Videos</p>
                  <p className="text-slate-400 text-sm">{stats.videos} files</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                View →
              </button>
            </div>

            <div 
              onClick={() => onViewChange('documents')}
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  📄
                </div>
                <div>
                  <p className="text-white font-medium">Documents</p>
                  <p className="text-slate-400 text-sm">{stats.documents} files</p>
                </div>
              </div>
              <button className="text-blue-400 hover:text-blue-300 text-sm">
                View →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Sync Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-500 to-indigo-500 p-2 rounded-lg">
                📡
              </span>
              Telegram Sync
            </h3>
            <p className="text-slate-400 text-sm">
              Forward files to your bot and sync them to your cloud storage
            </p>
          </div>
          <ChannelSync
            user={user}
            onSyncComplete={loadFiles}
            showNotification={showNotification}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h4 className="text-white font-medium">Sync Status</h4>
            </div>
            <p className="text-slate-400 text-sm">
              Ready to sync your latest files
            </p>
          </div>
          
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h4 className="text-white font-medium">Bot Connection</h4>
            </div>
            <p className="text-slate-400 text-sm">
              Connected to Telegram API
            </p>
          </div>
          
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h4 className="text-white font-medium">Storage</h4>
            </div>
            <p className="text-slate-400 text-sm">
              Unlimited space available
            </p>
          </div>
        </div>
      </div>

      {showChannelModal && user?.channel_setup_complete === false && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-white mb-3">Set Up Your Channel</h2>
            <p className="text-slate-400 mb-4">
              Please enter your Telegram Channel ID to start using your cloud storage.
            </p>
            <input
              type="text"
              className="w-full p-3 rounded-lg bg-slate-700 text-white mb-4 border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. -1001234567890"
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              disabled={channelLoading}
            />
            {channelError && (
              <div className="text-red-400 mb-3 p-2 bg-red-500/10 rounded-lg">
                {channelError}
              </div>
            )}
            <button
              className={`w-full ${
                channelLoading 
                  ? 'bg-slate-600' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
              } text-white font-bold py-3 px-4 rounded-lg transition-all duration-300`}
              onClick={async () => {
                setChannelLoading(true);
                setChannelError("");
                try {
                  const res = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.registerChannel}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_id: user.id || user.telegram_id,
                      channel_id: channelId
                    })
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    setShowChannelModal(false);
                    if (typeof setUser === "function") {
                      setUser(prev => ({
                        ...prev,
                        private_channel_id: channelId,
                        channel_setup_complete: true
                      }));
                    }
                  } else {
                    setChannelError(data.error || "Failed to update channel.");
                  }
                } catch (e) {
                  setChannelError("Network error.");
                }
                setChannelLoading(false);
              }}
              disabled={!channelId || channelLoading}
            >
              {channelLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Channel ID"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}