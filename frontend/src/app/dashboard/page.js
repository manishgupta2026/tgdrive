"use client";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import FileGrid from "./components/FileGrid";
import UploadModal from "./components/UploadModal";
import Lightbox from "./components/Lightbox";
import Notification from "./components/Notification";
import DashboardOverview from "./components/DashboardOverview";
import Settings from "./components/Settings";
import VideoPlayerModal from "./components/VideoPlayerModal";
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

export default function Dashboard() {
  // Core state (unchanged logic)
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentView, setCurrentView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoFile, setVideoFile] = useState(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Bot usernames state
  const [botUsernames, setBotUsernames] = useState([]);

  // Fetch bot usernames
  useEffect(() => {
    fetch(
      `${getBackendUrl()}${API_CONFIG.ENDPOINTS.botUsernames}`
    )
      .then((res) => res.json())
      .then((data) => setBotUsernames(data.usernames || []));
  }, []);

  // Utilities (unchanged logic)
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // File operations (unchanged logic)
  const getFilteredFiles = () => {
    let filtered = files;
    if (searchQuery.trim()) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    switch (currentView) {
      case "photos":
        return filtered.filter((f) => f.type?.startsWith("image/"));
      case "videos":
        return filtered.filter((f) => f.type?.startsWith("video/"));
      case "documents":
        return filtered.filter(
          (f) => !f.type?.startsWith("image/") && !f.type?.startsWith("video/")
        );
      case "recent":
        return [...filtered].sort(
          (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
      default:
        return filtered;
    }
  };

  const handleFileSelection = (fileId, event) => {
    event?.stopPropagation();
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedFiles((prev) =>
        prev.includes(fileId)
          ? prev.filter((id) => id !== fileId)
          : [...prev, fileId]
      );
    } else {
      setSelectedFiles([fileId]);
    }
  };

  const openLightbox = (fileId) => {
    const imageFiles = getFilteredFiles().filter((f) =>
      f.type?.startsWith("image/")
    );
    const index = imageFiles.findIndex((f) => f.id === fileId);
    if (index !== -1) {
      setLightboxIndex(index);
      setShowLightbox(true);
    }
  };

  const openVideoModal = (file) => {
    setVideoFile(file);
    setShowVideoModal(true);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} files permanently?`)) return;
    let deletedCount = 0;
    for (const fileId of selectedFiles) {
      try {
        const response = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.files}/${fileId}`, {
          method: "DELETE",
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (response.ok) deletedCount++;
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
    await loadFiles();
    setSelectedFiles([]);
    showNotification(`Deleted ${deletedCount} files`, "success");
  };

  // Data loading (unchanged logic)
  const loadFiles = async (userId = user?.id) => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${getBackendUrl()}${API_CONFIG.ENDPOINTS.files}?user_id=${userId}`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
      );
      if (response.ok) {
        const data = await response.json();
        let filesArray = [];
        if (Array.isArray(data)) filesArray = data;
        else if (data.files && Array.isArray(data.files)) filesArray = data.files;
        else if (data.data && Array.isArray(data.data)) filesArray = data.data;
        const transformedFiles = filesArray.map((file) => ({
          id: file._id || file.id,
          name: file.original_name || file.name || "Unknown File",
          size: file.file_size || file.size || 0,
          type: file.mime_type || file.type || "application/octet-stream",
          uploadedAt: file.upload_date || file.uploadedAt || new Date(),
          telegram_file_id: file.telegram_file_id,
          thumbnailUrl: file.mime_type?.startsWith("image/")
            ? `${getBackendUrl()}/api/thumbnail/${file.telegram_file_id}`
            : null,
          previewUrl: `${getBackendUrl()}/api/telegram-file/${file.telegram_file_id}`,
          telegram_link: file.telegram_link,
        }));
        const sortedFiles = [...transformedFiles].sort(
          (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        setFiles(sortedFiles);
      } else {
        setFiles([]);
      }
    } catch (error) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Authentication Logic (fixed to prioritize telegram_id)
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        // Always fetch from backend for freshest user data
        const res = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.user}`, { credentials: "include" });
        let userData = null;
        if (res.ok) {
          userData = await res.json();
          console.log('🔍 Raw user data from /api/user/me:', userData);
        }
        if (userData && (userData.telegram_id || userData.id)) {
          // IMPORTANT: Use telegram_id as the primary identifier
          const userId = userData.telegram_id || userData.id;
          const normalizedUser = {
            ...userData,
            id: userId, // Set id to telegram_id for consistency
            telegram_id: userData.telegram_id, // Keep original telegram_id
          };
          console.log('✅ Normalized user for dashboard:', normalizedUser);
          setUser(normalizedUser);
          await loadFiles(userId);
          showNotification(
            `Welcome back, ${normalizedUser.first_name}!`,
            "success"
          );
        } else {
          window.location.href = "/";
        }
      } catch (error) {
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    };
    initializeDashboard();
    // eslint-disable-next-line
  }, []);

  // Get file counts (unchanged logic)
  const getFileCounts = () => ({
    photos: files.filter((f) => f.type?.startsWith("image/")).length,
    videos: files.filter((f) => f.type?.startsWith("video/")).length,
    documents: files.filter(
      (f) => !f.type?.startsWith("image/") && !f.type?.startsWith("video/")
    ).length,
    total: files.length,
  });

  // Sync functions (unchanged logic)
  const triggerSync = async () => {
    try {
      setLoading(true);
      showNotification("Starting channel sync...", "info");
      if (!user?.id) {
        showNotification("No user ID found for sync.", "error");
        setLoading(false);
        return;
      }
      const response = await fetch(
        `${getBackendUrl()}${API_CONFIG.ENDPOINTS.syncChannel}/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ limit: 100 }),
        }
      );
      const result = await response.json();
      if (result.success) {
        showNotification(
          `Sync completed! ${result.stats?.synced || 0} files synced, ${
            result.stats?.skipped || 0
          } skipped`,
          "success"
        );
        await loadFiles(user.id);
      } else {
        showNotification(`Sync failed: ${result.error}`, "error");
      }
    } catch (error) {
      showNotification("Sync failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced loading state (design updated)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-white mb-2">
            Loading Dashboard
          </h2>
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // No user found - Enhanced login screen (design updated)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172b] to-[#1e293b] flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full p-8 bg-[#1e293b]/80 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-4xl text-white mb-6 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Welcome to Telegram Drive
          </h2>
          <p className="text-slate-300 mb-8">
            Please log in through Telegram to access your cloud storage.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
          >
            Login with Telegram
          </button>
        </div>
      </div>
    );
  }

  // Channel setup prompt - show for new users or users without channel setup (design updated)
  if (user && (!user.channel_setup_complete || !user.private_channel_id)) {
    return (
      <ChannelSetupPrompt
        user={user}
        botUsernames={botUsernames}
        onChannelRegistered={async () => {
          try {
            // First try to get updated user data from backend
            const res = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.user}`, {
              credentials: "include",
            });
            
            let updatedUser;
            if (res.ok) {
              updatedUser = await res.json();
            } else {
              // Fallback: Update current user object with channel setup complete
              updatedUser = {
                ...user,
                channel_setup_complete: true,
                private_channel_id: true // We know it's set since registration was successful
              };
            }
            
            const normalizedUser = {
              ...updatedUser,
              id: updatedUser.telegram_id || updatedUser.id,
              telegram_id: updatedUser.telegram_id || updatedUser.id,
            };
            
            // Update localStorage with the updated user data
            if (typeof window !== "undefined") {
              localStorage.setItem("td_user", JSON.stringify(normalizedUser));
            }
            
            setUser(normalizedUser);
            setCurrentView("dashboard"); // Redirect to dashboard overview
            await loadFiles(normalizedUser.id);
            showNotification("Channel setup complete! Welcome to your dashboard!", "success");
          } catch (e) {
            // Even if there's an error, we can still proceed since channel registration was successful
            const fallbackUser = {
              ...user,
              channel_setup_complete: true,
              private_channel_id: true
            };
            
            if (typeof window !== "undefined") {
              localStorage.setItem("td_user", JSON.stringify(fallbackUser));
            }
            
            setUser(fallbackUser);
            setCurrentView("dashboard");
            showNotification("Channel setup complete! Welcome to your dashboard!", "success");
          }
        }}
      />
    );
  }

  // Main dashboard (design updated)
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172b] to-[#1e293b] text-white">
      {/* Notification */}
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Mobile Header */}
      <Header
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onUpload={() => setShowUploadModal(true)}
        currentView={currentView}
        fileCount={getFilteredFiles().length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          user={user}
          files={files}
          counts={getFileCounts()}
          currentView={currentView}
          setCurrentView={setCurrentView}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
          onUpload={() => setShowUploadModal(true)}
          formatFileSize={formatFileSize}
        />

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Desktop Header */}
          <Header
            isMobile={false}
            isDesktop={true}
            currentView={currentView}
            fileCount={getFilteredFiles().length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Content */}
          <div className="p-4 lg:p-6">
            {/* Show Dashboard Overview OR File Grid */}
            {currentView === "dashboard" ? (
              <DashboardOverview
                user={user}
                files={files}
                getBackendUrl={getBackendUrl}
                formatFileSize={formatFileSize}
                showNotification={showNotification}
                onViewChange={setCurrentView}
                loadFiles={loadFiles}
              />
            ) : currentView === "settings" ? (
              <Settings
                user={user}
                getBackendUrl={getBackendUrl}
                showNotification={showNotification}
                onChannelChanged={async () => {
                  // Reload user data after channel change
                  const res = await fetch(
                    `${getBackendUrl()}${API_CONFIG.ENDPOINTS.user}/${user.id}`
                  );
                  if (res.ok) {
                    const updatedUser = await res.json();
                    setUser(updatedUser);
                    await loadFiles(updatedUser.id);
                  }
                }}
              />
            ) : (
              <>
                {/* Selection bar */}
                {selectedFiles.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-xl p-4 mb-6 backdrop-blur-md">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <span className="text-indigo-300 font-medium flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {selectedFiles.length} {selectedFiles.length > 1 ? 'files' : 'file'} selected
                      </span>
                      <div className="flex gap-2 flex-wrap justify-center">
                        <button
                          onClick={() => {
                            selectedFiles.forEach((fileId) => {
                              const file = files.find((f) => f.id === fileId);
                              if (file) {
                                window.open(
                                  `${getBackendUrl()}${API_CONFIG.ENDPOINTS.download}/${file.telegram_file_id}`,
                                  "_blank"
                                );
                              }
                            });
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedFiles([])}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Grid */}
                <FileGrid
                  files={getFilteredFiles()}
                  currentView={currentView}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelection}
                  onImageClick={openLightbox}
                  getBackendUrl={getBackendUrl}
                  formatFileSize={formatFileSize}
                  searchQuery={searchQuery}
                  onUpload={() => setShowUploadModal(true)}
                  onVideoClick={openVideoModal}
                />
              </>
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        user={user}
        getBackendUrl={getBackendUrl}
        onUploadSuccess={() => {
          loadFiles();
          showNotification("Files uploaded successfully!", "success");
        }}
        showNotification={showNotification}
      />

      {/* Lightbox */}
      <Lightbox
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        files={getFilteredFiles().filter((f) => f.type?.startsWith("image/"))}
        currentIndex={lightboxIndex}
        setCurrentIndex={setLightboxIndex}
        formatFileSize={formatFileSize}
      />

      {/* Video Modal */}
      {showVideoModal && videoFile && (
        <VideoPlayerModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          file={videoFile}
          formatFileSize={formatFileSize}
        />
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Channel Setup Prompt Component (design updated)
function ChannelSetupPrompt({ user, botUsernames, onChannelRegistered }) {
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get the bot username to display
 const getBotUsername = () => user?.assigned_bot_username || "";

  const botUsername = getBotUsername();

  const copyBotUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${botUsername}`);
      alert(`Copied @${botUsername} to clipboard!`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `@${botUsername}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`Copied @${botUsername} to clipboard!`);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Use telegram_id specifically for the backend lookup
      const userIdToSend = user.telegram_id || user.id;
      console.log('🔧 Sending channel registration with user_id:', userIdToSend);
      
      const res = await fetch(
        `${getBackendUrl()}${API_CONFIG.ENDPOINTS.registerChannel}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            user_id: userIdToSend,
            channel_id: channelId,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Channel registered! You can now upload files.");
        onChannelRegistered && onChannelRegistered();
      } else {
        setError(data.error || "Failed to register channel.");
      }
    } catch (e) {
      setError("Network error.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172b] to-[#1e293b] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-slate-900/50 backdrop-blur-lg rounded-2xl p-8 max-w-lg w-full text-center border border-slate-700 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
          </svg>
          Set Up Your Telegram Channel
        </h2>
        <div className="mb-6 text-slate-200 bg-slate-800/50 rounded-xl p-4">
          <span className="font-medium">Important:</span> Please add{" "}
          <button
            onClick={copyBotUsername}
            className="inline-block cursor-pointer px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg border border-indigo-500 shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-0.5"
            title="Click to copy bot username"
          >
            @{botUsername}
          </button>{" "}
          as an admin to your channel.
        </div>
        <ol className="text-slate-300 text-left mb-6 list-decimal pl-6 space-y-3 bg-slate-800/30 p-4 rounded-xl">
          <li className="pb-2 border-b border-slate-700">Create a private Telegram channel</li>
          <li className="pb-2 border-b border-slate-700">
            Add{" "}
            <button
              onClick={copyBotUsername}
              className="inline-block cursor-pointer px-2 py-1 bg-indigo-600 text-white text-sm font-bold rounded border border-indigo-500 hover:bg-indigo-700 transition"
              title="Click to copy bot username"
            >
              @{botUsername}
            </button>{" "}
            as an admin with <span className="bg-slate-700 px-2 py-1 rounded text-xs">Post Messages</span> permission
          </li>
          <li className="pb-2 border-b border-slate-700">
            Send a message in your channel, then forward it to{" "}
            <span className="bg-slate-700 px-2 py-1 rounded text-xs">@userinfobot</span> to get the channel ID
          </li>
          <li>Paste your channel ID below and click Register</li>
        </ol>
        <div className="relative mb-4">
          <input
            className="w-full p-4 pr-12 rounded-xl bg-slate-800/50 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            placeholder="e.g. -1001234567890"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            disabled={loading}
          />
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400 absolute right-4 top-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>
        <button
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70"
          onClick={handleRegister}
          disabled={loading || !channelId}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering Channel...
            </span>
          ) : (
            "Register Channel"
          )}
        </button>
        {error && <div className="text-red-400 mt-4 p-2 bg-red-900/30 rounded-lg">{error}</div>}
        {success && <div className="text-green-400 mt-4 p-2 bg-green-900/30 rounded-lg">{success}</div>}
      </div>
    </div>
  );
}