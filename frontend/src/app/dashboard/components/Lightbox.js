'use client';
import { useEffect } from 'react';
import Image from 'next/image'; // Import Next.js Image component

export default function Lightbox({ 
  isOpen, 
  onClose, 
  files, 
  currentIndex, 
  setCurrentIndex, 
  formatFileSize 
}) {
  const currentFile = files[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          break;
        case 'ArrowRight':
          if (currentIndex < files.length - 1) setCurrentIndex(currentIndex + 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, files.length, setCurrentIndex, onClose]);

  if (!isOpen || !currentFile) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-60"
      >
        ✕
      </button>

      {/* Navigation */}
      {files.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(files.length - 1, currentIndex + 1))}
            disabled={currentIndex === files.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </>
      )}

      {/* Image */}
      <div className="max-w-full max-h-full flex items-center justify-center">
        {currentFile.previewUrl ? (
          <Image
            src={currentFile.previewUrl}
            alt={currentFile.name || 'Preview'}
            width={0}
            height={0}
            sizes="100vw"
            className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-lg mx-auto"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        ) : (
          <div className="bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl w-full h-64 flex items-center justify-center">
            <span className="text-gray-500">No preview available</span>
          </div>
        )}
      </div>

      {/* Image info */}
      <div className="absolute bottom-4 left-4 right-4 max-w-md mx-auto bg-black/50 backdrop-blur-sm rounded-xl p-4 text-white">
        <h3 className="font-medium mb-1 truncate">{currentFile.name}</h3>
        <p className="text-sm text-white/70">
          {formatFileSize(currentFile.size)} • {new Date(currentFile.uploadedAt).toLocaleDateString()} • {currentIndex + 1} of {files.length}
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