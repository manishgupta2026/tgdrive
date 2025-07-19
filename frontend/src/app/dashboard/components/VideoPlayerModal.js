'use client';
import React from 'react';
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

const TELEGRAM_BOT_LIMIT = 20 * 1024 * 1024; // 20MB

export default function VideoPlayerModal({ isOpen, onClose, file, formatFileSize }) {
  if (!isOpen || !file) return null;

  const isTooLarge = file.size > TELEGRAM_BOT_LIMIT;
  const videoSrc = file.previewUrl || `${getBackendUrl()}/api/telegram-file/${file.telegram_file_id}`;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-60"
      >
        ✕
      </button>

      {/* Video or message */}
      <div className="max-w-full max-h-full flex items-center justify-center w-full h-full">
        {isTooLarge ? (
          <div className="bg-black/80 rounded-xl p-8 text-center max-w-md mx-auto">
            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-lg font-semibold mb-2">This video is too large to stream directly from Telegram.</div>
            <div className="text-slate-300 mb-4">
              Videos larger than 20MB cannot be streamed due to Telegram Bot API limits.<br />
              You can download it from Telegram directly.
            </div>
            {file.telegram_link && (
              <a
                href={file.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Open in Telegram
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <video
              src={videoSrc}
              controls
              preload="metadata"
              className="max-w-full max-h-[80vh] rounded-lg mx-auto bg-black"
              style={{ background: "#000" }}
            />
            {file.telegram_link && (
              <a
                href={file.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Open in Telegram
              </a>
            )}
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="absolute bottom-4 left-4 right-4 max-w-md mx-auto bg-black/50 backdrop-blur-sm rounded-xl p-4 text-white">
        <h3 className="font-medium mb-1 truncate">{file.name}</h3>
        <p className="text-sm text-white/70">
          {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}