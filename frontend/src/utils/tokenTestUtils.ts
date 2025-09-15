'use client';

import { apiClient } from '@/lib/api';
import { authService } from '@/lib/auth';

/**
 * Test utilities for token management
 * These functions are for testing purposes only
 */

export const tokenTestUtils = {
  /**
   * Simulate token expiration for testing
   */
  simulateTokenExpiration(): void {
    const expiredToken = this.createExpiredToken();
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', expiredToken);
    }
  },

  /**
   * Create an expired JWT token for testing
   */
  createExpiredToken(): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: 'test-user',
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      iat: Math.floor(Date.now() / 1000) - 7200,
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'fake-signature';

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  },

  /**
   * Create a token that expires soon for testing
   */
  createExpiringToken(expiresInSeconds: number = 300): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: 'test-user',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      iat: Math.floor(Date.now() / 1000),
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = 'fake-signature';

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  },

  /**
   * Test automatic token refresh
   */
  async testTokenRefresh(): Promise<boolean> {
    try {
      console.log('Testing token refresh...');

      // Simulate an API call that would trigger token refresh
      await apiClient.get('/auth/me');

      console.log('Token refresh test passed');
      return true;
    } catch (error) {
      console.error('Token refresh test failed:', error);
      return false;
    }
  },

  /**
   * Get current token info for debugging
   */
  getTokenInfo(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    tokenValid: boolean;
    timeUntilExpiry: number | null;
  } {
    const accessToken = authService.getAccessToken();
    const refreshToken = authService.getRefreshToken();

    let tokenValid = false;
    let timeUntilExpiry: number | null = null;

    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        tokenValid = payload.exp > currentTime;
        timeUntilExpiry = payload.exp - currentTime;
      } catch {
        tokenValid = false;
      }
    }

    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      tokenValid,
      timeUntilExpiry,
    };
  },

  /**
   * Log token status for debugging
   */
  logTokenStatus(): void {
    const info = this.getTokenInfo();
    console.log('Token Status:', {
      ...info,
      timeUntilExpiryFormatted: info.timeUntilExpiry
        ? `${Math.floor(info.timeUntilExpiry / 60)}m ${info.timeUntilExpiry % 60}s`
        : 'N/A'
    });
  },

  /**
   * Clear all tokens (for testing logout)
   */
  clearTokens(): void {
    authService.clearTokens();
    console.log('All tokens cleared');
  },
};

// Make available globally for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).tokenTestUtils = tokenTestUtils;
}