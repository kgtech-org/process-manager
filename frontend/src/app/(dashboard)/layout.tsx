'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Navigation } from '@/components/layout/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        <main className="flex-1 lg:ml-64">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}