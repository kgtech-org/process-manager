'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// GuestGuard Props - for pages that should only be accessible to unauthenticated users
interface GuestGuardProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

// Loading Component
const GuestLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

// Guest Guard Component - Redirects authenticated users away from auth pages
export const GuestGuard: React.FC<GuestGuardProps> = ({ 
  children, 
  redirectTo = '/',
  fallback = <GuestLoadingFallback />,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users after loading is complete
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // Show loading fallback while checking authentication
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show nothing while redirecting
  if (isAuthenticated) {
    return null;
  }

  // Render guest content for unauthenticated users
  return <>{children}</>;
};