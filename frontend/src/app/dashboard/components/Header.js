'use client';

export default function Header({ 
  isMobile, 
  isDesktop = false,
  sidebarOpen, 
  setSidebarOpen, 
  onUpload, 
  currentView, 
  fileCount, 
  searchQuery, 
  setSearchQuery 
}) {
  if (isMobile && !isDesktop) {
    return (
      <header className="lg:hidden bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            ☰
          </button>
          <h1 className="text-lg font-bold">TG Drive</h1>
          <button
            onClick={onUpload}
            className="p-2 bg-blue-600 text-white rounded-lg"
          >
            📤
          </button>
        </div>
        
        {/* Mobile Search */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </header>
    );
  }

  if (isDesktop) {
    return (
      <header className="hidden lg:block bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white capitalize">{currentView || 'Dashboard'}</h1>
            {/* <span className="bg-slate-700 text-slate-300 text-sm px-3 py-1 rounded-full">
              {fileCount || 0}
            </span> */}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return null;
}