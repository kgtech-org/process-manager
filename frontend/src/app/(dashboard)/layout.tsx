'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { NavigationWrapper } from '@/components/layout/NavigationWrapper';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { ChatProvider } from '@/contexts/chat.context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ChatProvider>
        <div className="min-h-screen bg-gray-50">
          <NavigationWrapper>
            <main className="w-full">
              {children}
            </main>
          </NavigationWrapper>
          <ChatWidget />
        </div>
      </ChatProvider>
    </AuthGuard>
  );
}