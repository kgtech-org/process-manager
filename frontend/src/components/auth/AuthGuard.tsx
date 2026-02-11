'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// AuthGuard Props
interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

// Loading Component
const AuthLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

// Authentication Guard Component
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  redirectTo = '/login',
  fallback = <AuthLoadingFallback />,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect unauthenticated users after loading is complete
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
      } else if (user && !user.hasPin && pathname !== '/setup-pin') {
        // Redirect to PIN setup if user hasn't set up a PIN yet
        router.push('/setup-pin');
      }
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo, pathname]);

  // Show loading fallback while checking authentication
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Render protected content for authenticated users
  return <>{children}</>;
};