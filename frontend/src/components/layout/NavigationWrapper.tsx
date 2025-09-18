'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from './Navigation';
import { TopNavbar } from './TopNavbar';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ children }) => {
  const { user } = useAuth();

  // Show sidebar for admin and manager roles, top navbar for regular users
  const shouldUseSidebar = user?.role === 'admin' || user?.role === 'manager';

  if (shouldUseSidebar) {
    // Admin/Manager: Use sidebar layout
    return (
      <>
        <Navigation />
        <div className="lg:pl-64">
          {children}
        </div>
      </>
    );
  } else {
    // Regular User: Use top navbar layout
    return (
      <>
        <TopNavbar />
        <div className="w-full">
          {children}
        </div>
      </>
    );
  }
};