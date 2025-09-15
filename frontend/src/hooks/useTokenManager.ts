'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { authService } from '@/lib/auth';

interface UseTokenManagerOptions {
  // Auto refresh token when it's about to expire
  autoRefresh?: boolean;
  // Refresh interval in minutes (default: 5)
  refreshInterval?: number;
  // Show refresh notifications
  showNotifications?: boolean;
}

export const useTokenManager = (options: UseTokenManagerOptions = {}) => {
  const { user, refreshUser, logout } = useAuth();
  const {
    autoRefresh = true,
    refreshInterval = 5,
    showNotifications = false,
  } = options;

  // Manual token refresh
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!authService.isAuthenticated()) {
        return false;
      }

      await apiClient.refreshToken();
      await refreshUser();

      if (showNotifications) {
        console.log('Token refreshed successfully');
      }

      return true;
    } catch (error) {
      console.error('Manual token refresh failed:', error);
      return false;
    }
  }, [refreshUser, showNotifications]);

  // Check token validity
  const isTokenValid = useCallback((): boolean => {
    const token = authService.getAccessToken();
    if (!token) return false;

    try {
      // Simple JWT expiration check
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }, []);

  // Get time until token expires (in seconds)
  const getTimeUntilExpiry = useCallback((): number | null => {
    const token = authService.getAccessToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp - currentTime;
    } catch {
      return null;
    }
  }, []);

  // Force logout and clear everything
  const forceLogout = useCallback(async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Force logout failed:', error);
      // Clear tokens anyway
      authService.clearTokens();
      window.location.href = '/login';
    }
  }, [logout]);

  // Check if token needs refresh soon
  const needsRefresh = useCallback((): boolean => {
    const timeUntilExpiry = getTimeUntilExpiry();
    if (!timeUntilExpiry) return false;

    // Refresh if token expires within 10 minutes
    return timeUntilExpiry < 600;
  }, [getTimeUntilExpiry]);

  // Auto refresh setup
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(async () => {
      if (needsRefresh()) {
        const success = await refreshToken();
        if (!success) {
          console.warn('Auto token refresh failed');
        }
      }
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, user, refreshInterval, needsRefresh, refreshToken]);

  // Monitor token validity
  useEffect(() => {
    if (!user) return;

    const checkValidity = () => {
      if (!isTokenValid()) {
        console.warn('Token is invalid, forcing logout');
        forceLogout();
      }
    };

    // Check immediately
    checkValidity();

    // Check every minute
    const interval = setInterval(checkValidity, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isTokenValid, forceLogout]);

  return {
    refreshToken,
    forceLogout,
    isTokenValid,
    needsRefresh,
    getTimeUntilExpiry,
    isAuthenticated: authService.isAuthenticated(),
  };
};