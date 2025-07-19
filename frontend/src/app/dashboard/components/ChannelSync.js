'use client';
import { useState, useEffect } from 'react';
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

export default function ChannelSync({ user, onSyncComplete, showNotification }) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMax, setProgressMax] = useState(0);

  const syncChannel = async () => {
    setSyncing(true);
    setProgress(0);
    setProgressMax(0);
    try {
      const response = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.syncChannel}/${user.id}`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stats) {
          setProgress(data.stats.synced + data.stats.skipped);
          setProgressMax(data.stats.total_messages);
        } else {
          setProgress(1);
          setProgressMax(1);
        }
        showNotification(`✅ Synced ${data.stats?.synced || 0} files!`, 'success');
        onSyncComplete && onSyncComplete();
      }
    } catch (error) {
      showNotification('❌ Sync failed. Please try again.', 'error');
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setProgress(0);
        setProgressMax(0);
      }, 2000);
    }
  };

  return (
    <div>
      <button
        onClick={syncChannel}
        disabled={syncing}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync Channel"}
      </button>
      {syncing && progressMax > 0 && (
        <div className="w-full bg-slate-600 rounded-full h-2 mt-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (progress / progressMax) * 100)}%` }}
          />
          <div className="text-xs text-slate-300 mt-1 text-right">
            {progress} / {progressMax} files processed
          </div>
        </div>
      )}
    </div>
  );
}