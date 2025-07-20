'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image'; // ✅ Next.js optimized image import
import SortSelector from './SortSelector';
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

export default function FileGrid({
  files,
  currentView,
  selectedFiles,
  onFileSelect,
  onImageClick,
  formatFileSize,
  searchQuery,
  onUpload,
  onVideoClick
}) {
  const [imageErrors, setImageErrors] = useState(new Set());
  const [sortBy, setSortBy] = useState('recent');

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.startsWith('video/')) return '🎥';
    if (type?.startsWith('audio/')) return '🎵';
    if (type?.includes('pdf')) return '📄';
    return '📁';
  };

  const handleImageError = (fileId) => {
    setImageErrors(prev => new Set(prev).add(fileId));
  };

  const sortedFiles = useMemo(() => {
    const sorted = [...files];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
        break;
      case 'size_desc':
        sorted.sort((a, b) => b.size - a.size);
        break;
      case 'size_asc':
        sorted.sort((a, b) => a.size - b.size);
        break;
      case 'type':
        sorted.sort((a, b) => {
          const order = file => file.type?.startsWith('image/') ? 0 : file.type?.startsWith('video/') ? 1 : 2;
          return order(a) - order(b);
        });
        break;
      default:
    }
    return sorted;
  }, [files, sortBy]);

  if (files.length === 0) {
    const icon = currentView === 'photos' ? '📷' : currentView === 'videos' ? '🎥' : '📄';
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4 opacity-50">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">No {currentView} found</h3>
        <p className="text-slate-400 max-w-sm mb-6">
          {searchQuery ? 'No files match your search' : `Upload your first ${currentView} to get started`}
        </p>
        <button
          onClick={onUpload}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          📤 Upload Files
        </button>
      </div>
    );
  }

  // --- PHOTO VIEW ---
  if (currentView === 'photos') {
    return (
      <div className="p-4">
        <style jsx>{`
          .photo-masonry { columns:1; column-gap:8px; }
          @media (min-width:640px) { .photo-masonry { columns:2; } }
          @media (min-width:768px) { .photo-masonry { columns:3; } }
          @media (min-width:1024px) { .photo-masonry { columns:4; } }
          @media (min-width:1280px) { .photo-masonry { columns:5; } }
          .photo-item {
            break-inside: avoid;
            margin-bottom: 8px;
            position: relative;
            border-radius: 12px;
            overflow: hidden;
            background: #1e293b;
            transition: all .2s ease;
            cursor: pointer;
            max-width: 100%;
          }
          .photo-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4);
          }
          .photo-item.selected { ring:3px solid #3b82f6; transform: scale(.98); }
          .photo-overlay {
            position:absolute; inset:0;
            background: linear-gradient(to top, rgba(0,0,0,0.7) 0%,transparent 40%);
            opacity:0;
            transition:opacity .2s ease;
            display:flex; flex-direction:column; justify-content:space-between; padding:12px;
          }
          .photo-item:hover .photo-overlay { opacity:1; }
          .control-btn {
            width:32px; height:32px; border-radius:50%;
            background:rgba(0,0,0,0.6); backdrop-filter:blur(8px);
            border:none; color:white;
            display:flex; align-items:center; justify-content:center;
            transition:all .2s ease; font-size:14px;
          }
          .control-btn:hover { background:rgba(0,0,0,0.8); transform:scale(1.1); }
          .checkbox-btn {
            width:24px; height:24px; border-radius:6px;
            border:2px solid rgba(255,255,255,0.7); background:rgba(0,0,0,0.4);
          }
          .checkbox-btn.selected {
            background:#3b82f6; border-color:#3b82f6;
          }
        `}</style>
        <div className="photo-masonry">
          {sortedFiles.map(file => (
            <div
              key={file.id}
              className={`photo-item ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
              onClick={e => {
                if (!e.target.closest('.control-btn')) onImageClick(file.id);
              }}
            >
              {imageErrors.has(file.id) ? (
                <div className="w-full aspect-square bg-slate-700 flex items-center justify-center text-4xl text-slate-500">
                  📷
                </div>
              ) : (
                <Image
                  src={file.thumbnailUrl || file.previewUrl || `${getBackendUrl()}/api/thumbnail/${file.telegram_file_id}`}
                  alt={file.name}
                  width={500}
                  height={500}
                  layout="responsive"
                  objectFit="contain"
                  onError={() => handleImageError(file.id)}
                />
              )}
              <div className="photo-overlay">
                <div className="flex justify-between items-start">
                  <button
                    className={`control-btn checkbox-btn ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      onFileSelect(file.id, e);
                    }}
                  >
                    {selectedFiles.includes(file.id) && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293..."></path>
                      </svg>
                    )}
                  </button>
                  <button
                    className="control-btn"
                    title="Download"
                    onClick={e => {
                      e.stopPropagation();
                      window.open(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.download}/${file.telegram_file_id}`, '_blank');
                    }}
                  >
                    ⬇
                  </button>
                </div>
                <div className="text-white">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-white/70">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VIDEO VIEW ---
  if (currentView === 'videos') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
        {sortedFiles.map(file => (
          <div
            key={file.id}
            onClick={() => onVideoClick(file)}
            className={`bg-slate-800 rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl group
              ${selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500 scale-105' : ''}`}
          >
            <div className="aspect-square bg-slate-700 flex items-center justify-center relative overflow-hidden">
              {file.type?.startsWith('video/') ? (
                <>
                  <video
                    src={`${getBackendUrl()}/api/stream/${file.telegram_file_id}`}
                    className="w-full h-full object-cover"
                    poster={file.thumbnailUrl || `${getBackendUrl()}/api/thumbnail/${file.telegram_file_id}`}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white text-xl">▶️</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center text-4xl">{getFileIcon(file.type)}</div>
              )}
              {selectedFiles.includes(file.id) && (
                <div className="absolute top-2 left-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293..."></path>
                    </svg>
                  </div>
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    window.open(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.download}/${file.telegram_file_id}`, '_blank');
                  }}
                  className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  title="Download"
                >
                  ⬇️
                </button>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-white text-sm font-medium truncate mb-1" title={file.name}>{file.name}</h3>
              <p className="text-slate-400 text-xs">
                {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- DOCUMENTS & MIXED VIEW ---
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {sortedFiles.map(file => (
        <div
          key={file.id}
          className={`bg-slate-800 rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl group
            ${selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500 scale-105' : ''}`}
          onClick={e => {
            if (file.type?.startsWith('video/')) {
              e.stopPropagation();
              onVideoClick(file);
            } else {
              onFileSelect(file.id, e);
            }
          }}
        >
          <div className="aspect-square bg-slate-700 flex items-center justify-center relative overflow-hidden">
            {file.type?.startsWith('video/') ? (
              <>
                <video
                  src={`${getBackendUrl()}/api/stream/${file.telegram_file_id}`}
                  className="w-full h-full object-cover"
                  poster={file.thumbnailUrl || `${getBackendUrl()}/api/thumbnail/${file.telegram_file_id}`}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white text-xl">▶️</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center text-4xl">{getFileIcon(file.type)}</div>
            )}
            {selectedFiles.includes(file.id) && (
              <div className="absolute top-2 left-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293..."></path>
                  </svg>
                </div>
              </div>
            )}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => {
                  e.stopPropagation();
                  const url = file.telegram_link
                    ? file.telegram_link
                    : `${getBackendUrl()}${API_CONFIG.ENDPOINTS.download}/${file.telegram_file_id}`;
                  window.open(url, '_blank');
                }}
                className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                title="Download"
              >
                ⬇️
              </button>
            </div>
          </div>
          <div className="p-3">
            <h3 className="text-white text-sm font-medium truncate mb-1" title={file.name}>{file.name}</h3>
            <p className="text-slate-400 text-xs">
              {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
            </p>
            {file.telegram_link && (
              <a
                href={file.telegram_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
              >
                Open in Telegram
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
