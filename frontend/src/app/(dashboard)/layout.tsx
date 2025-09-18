'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { NavigationWrapper } from '@/components/layout/NavigationWrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <NavigationWrapper>
          <main className="w-full">
            {children}
          </main>
        </NavigationWrapper>
      </div>
    </AuthGuard>
  );
}