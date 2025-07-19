'use client';

export default function Notification({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 px-6 py-4 rounded-xl text-white font-medium shadow-2xl z-50 ${
      notification.type === 'error' ? 'bg-red-500' : 
      notification.type === 'success' ? 'bg-green-500' : 
      notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`}>
      <div className="flex items-center gap-3">
        <span>{notification.message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}