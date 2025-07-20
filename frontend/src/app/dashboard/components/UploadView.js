'use client';
import FileUploader from '../../../components/FileUploader';

const UploadView = ({ user, getBackendUrl, showNotification, onUploadComplete, isMobile }) => {
  const handleUploadSuccess = () => {
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const handleUploadError = (error, file) => {
    console.error('Upload error:', error, file);
  };

  const handleUploadProgress = (progress) => {
    console.log('Upload progress:', progress);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 sm:mb-6">
            <span className="text-2xl sm:text-3xl">📤</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">
            Upload to Cloud
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Securely store your files using Telegram&apos;s infrastructure. 
            Drag and drop files or click to browse from your device.
          </p>
        </div>

        {/* Upload Component */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-12">
            <FileUploader
              userId={user?.id}
              onUploadSuccess={handleUploadSuccess}
              onUploadProgress={handleUploadProgress}
              onUploadError={handleUploadError}
              getBackendUrl={getBackendUrl}
              showNotification={showNotification}
            />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/30">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <span className="text-lg sm:text-xl">🔒</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Secure Storage</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Your files are encrypted and stored securely using Telegram&apos;s robust infrastructure.
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/30">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <span className="text-lg sm:text-xl">⚡</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Fast Upload</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              High-speed uploads with automatic compression and optimization for faster transfers.
            </p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/30 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                <span className="text-lg sm:text-xl">📱</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Cross Platform</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Access your files from any device - mobile, tablet, or desktop with full synchronization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;