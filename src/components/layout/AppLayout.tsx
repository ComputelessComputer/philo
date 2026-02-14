import { useState } from 'react';
import TimelineView from '../journal/TimelineView';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Philo
              </h1>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Library
                </div>
                <div className="text-sm text-gray-400 dark:text-gray-500 italic">
                  No saved widgets yet
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main editor area */}
      <main className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Untitled Note
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TimelineView />
        </div>
      </main>
    </div>
  );
}
