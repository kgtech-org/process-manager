'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/validation';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/api';

// Authentication Context Types
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, otp: string, temporaryToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
    setupTokenRefreshCallback();
    setupAuthEventListeners();

    return () => {
      cleanupAuthEventListeners();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setUser(null);
        return;
      }

      // Fetch current user data
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      // Clear invalid tokens
      authService.clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, otp: string, temporaryToken: string): Promise<User> => {
    try {
      setIsLoading(true);
      
      const loginResponse = await authService.verifyLoginOtp(
        { otp },
        temporaryToken
      );
      
      setUser(loginResponse.user);
      return loginResponse.user;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (!authService.isAuthenticated()) {
        setUser(null);
        return;
      }

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('User refresh failed:', error);
      // Clear invalid tokens and logout
      authService.clearTokens();
      setUser(null);
      throw error;
    }
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
  };

  // Setup token refresh callback to sync auth state
  const setupTokenRefreshCallback = (): void => {
    apiClient.setTokenRefreshCallback(async (newToken: string) => {
      if (!newToken) {
        // Token refresh failed - logout user
        setUser(null);
        return;
      }

      try {
        // Refresh user data when token is refreshed
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        console.log('User session refreshed automatically');
      } catch (error) {
        console.error('Failed to refresh user data after token refresh:', error);
        setUser(null);
      }
    });
  };

  // Setup auth event listeners
  const setupAuthEventListeners = (): void => {
    if (typeof window === 'undefined') return;

    // Listen for auth logout events
    window.addEventListener('auth:logout', handleAuthLogout);

    // Listen for visibility change to refresh token when app becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for focus to refresh token when window gains focus
    window.addEventListener('focus', handleWindowFocus);
  };

  const cleanupAuthEventListeners = (): void => {
    if (typeof window === 'undefined') return;

    window.removeEventListener('auth:logout', handleAuthLogout);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
  };

  const handleAuthLogout = (): void => {
    setUser(null);
    router.push('/login');
  };

  const handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && user && authService.isAuthenticated()) {
      try {
        // Refresh user data when app becomes visible (in case of role changes, etc.)
        await refreshUser();
      } catch (error) {
        console.warn('Failed to refresh user on visibility change:', error);
      }
    }
  };

  const handleWindowFocus = async (): Promise<void> => {
    if (user && authService.isAuthenticated()) {
      try {
        // Check if token needs refresh when window gains focus
        await apiClient.refreshToken();
      } catch (error) {
        console.warn('Token refresh on focus failed:', error);
      }
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user && authService.isAuthenticated(),
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};