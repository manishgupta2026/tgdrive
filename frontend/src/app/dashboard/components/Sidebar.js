"use client";

import { useState, useEffect } from "react";
import Image from "next/image"; // ✅ Added import
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

export default function Sidebar({
  user,
  files,
  counts,
  currentView,
  setCurrentView,
  sidebarOpen,
  setSidebarOpen,
  isMobile,
  onUpload,
  formatFileSize,
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", count: null },
    { id: "photos", label: "Photos", icon: "📷", count: counts?.photos || 0 },
    { id: "videos", label: "Videos", icon: "🎥", count: counts?.videos || 0 },
    {
      id: "documents",
      label: "Documents",
      icon: "📄",
      count: counts?.documents || 0,
    },
    { id: "shared", label: "Shared", icon: "👥", count: counts?.shared || 0 },
    { id: "settings", label: "Settings", icon: "⚙️", count: null },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.first_name || "User")}&background=6366f1&color=fff`;
  const profileImageUrl = user?.photo_url || fallbackAvatarUrl;

  return (
    <>
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-full max-w-[280px]
          bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-800
          transform transition-all duration-300
          ${sidebarOpen || !isMobile ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${isScrolled ? "lg:border-slate-700" : "lg:border-transparent"}
          shadow-xl lg:shadow-none
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-xl shadow-lg">
                  📁
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">TG Drive</h1>
                  <p className="text-xs text-slate-400">Secure Cloud Storage</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Upload button */}
            <button
              onClick={onUpload}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all duration-300 px-6 py-3 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Upload Files</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                    currentView === item.id
                      ? "bg-gradient-to-r from-blue-900/40 to-blue-800/30 text-white shadow-inner"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.count > 0 && (
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded-full min-w-[26px] text-center">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Storage Status */}
            <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-medium">Unlimited Storage</h3>
                  <p className="text-xs text-slate-400">
                    All your files safe in the cloud
                  </p>
                </div>
              </div>
            </div>
          </nav>

          {/* ✅ User Info with <Image /> */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src={profileImageUrl}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full border-2 shadow-lg w-10 h-10 sm:w-10 sm:h-10"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallbackAvatarUrl;
                  }}
                  unoptimized // required for external image URLs
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || "Premium Account"}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.logout}`, {
                      method: "POST",
                      credentials: "include",
                    });
                  } catch (e) {}
                  window.location.href = "/";
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors group relative"
                title="Logout"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs rounded bg-slate-800 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
