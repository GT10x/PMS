'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <i className="fas fa-wifi-slash text-3xl text-gray-400 dark:text-gray-500"></i>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          You're Offline
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <i className="fas fa-refresh mr-2"></i>
          Try Again
        </button>
      </div>
    </div>
  );
}
