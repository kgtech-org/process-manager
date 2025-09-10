'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Role types
type UserRole = 'admin' | 'manager' | 'user';

// RoleGuard Props
interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  requireAll?: boolean;
}

// Default Access Denied Component
const AccessDeniedFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 p-3">
        <svg 
          className="h-10 w-10 text-red-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" 
          />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Access Denied
      </h2>
      <p className="text-gray-600">
        You don't have permission to access this resource.
      </p>
    </div>
  </div>
);

// Role-based Access Control Guard Component
export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles,
  fallback = <AccessDeniedFallback />,
  requireAll = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // User must be authenticated to access role-protected content
  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  const userRole = user.role;

  // Check role permissions
  const hasRequiredRole = requireAll
    ? allowedRoles.every(role => userRole === role) // User must have ALL roles (unusual case)
    : allowedRoles.includes(userRole); // User must have ANY of the allowed roles

  if (!hasRequiredRole) {
    return <>{fallback}</>;
  }

  // Render protected content for users with required roles
  return <>{children}</>;
};

// Convenience components for specific role checks
export const AdminOnly: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard allowedRoles={['admin']} {...props} />
);

export const ManagerAndAbove: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard allowedRoles={['admin', 'manager']} {...props} />
);

export const AllRoles: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard allowedRoles={['admin', 'manager', 'user']} {...props} />
);