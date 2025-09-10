import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute inset-0 bg-grid-gray-100 opacity-25"></div>
      <div className="relative">
        {/* Header */}
        <header className="px-4 py-6">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">PM</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Process Manager</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="px-4 py-6 text-center text-sm text-gray-500">
          <p>&copy; 2025 Togocom. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}