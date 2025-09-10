import { apiClient, TokenManager, ApiResponse } from './api';
import {
  User,
  Department,
  JobPosition,
  RegistrationStep1Data,
  RegistrationStep2Data,
  RegistrationStep3Data,
  LoginRequestData,
  LoginVerifyData,
  ProfileUpdateData,
  EmailVerificationData,
} from './validation';

// Authentication Response Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface RegistrationStep1Response {
  temporaryToken: string;
  message: string;
  otp?: string; // Only in development
}

export interface RegistrationStep2Response {
  registrationToken: string;
  message: string;
}

export interface RegistrationStep3Response {
  user: User;
  message: string;
}

// Authentication Service
class AuthService {
  
  // ============================
  // REGISTRATION FLOW
  // ============================
  
  /**
   * Step 1: Send registration email and get OTP
   */
  async registerStep1(data: RegistrationStep1Data): Promise<RegistrationStep1Response> {
    const response = await apiClient.post<RegistrationStep1Response>('/auth/register/step1', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Registration failed');
    }
    return response.data;
  }

  /**
   * Step 2: Verify OTP and get registration token
   */
  async registerStep2(data: RegistrationStep2Data, temporaryToken: string): Promise<RegistrationStep2Response> {
    const response = await apiClient.post<RegistrationStep2Response>('/auth/register/step2', data, {
      headers: {
        'X-Temp-Token': temporaryToken,
      },
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'OTP verification failed');
    }
    return response.data;
  }

  /**
   * Step 3: Complete registration with profile info
   */
  async registerStep3(data: RegistrationStep3Data, registrationToken: string): Promise<RegistrationStep3Response> {
    const response = await apiClient.post<RegistrationStep3Response>('/auth/register/step3', data, {
      headers: {
        'X-Registration-Token': registrationToken,
      },
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Profile completion failed');
    }
    return response.data;
  }

  // ============================
  // LOGIN FLOW
  // ============================

  /**
   * Request OTP for login
   */
  async requestLoginOtp(data: LoginRequestData): Promise<RegistrationStep1Response> {
    const response = await apiClient.post<RegistrationStep1Response>('/auth/request-otp', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to send OTP');
    }
    return response.data;
  }

  /**
   * Verify OTP and complete login
   */
  async verifyLoginOtp(data: LoginVerifyData, temporaryToken: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/verify-otp', data, {
      headers: {
        'X-Temp-Token': temporaryToken,
      },
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }

    // Store tokens
    const { accessToken, refreshToken } = response.data;
    TokenManager.setTokens(accessToken, refreshToken);

    return response.data;
  }

  // ============================
  // TOKEN MANAGEMENT
  // ============================

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Token refresh failed');
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
    TokenManager.setTokens(newAccessToken, newRefreshToken);

    return response.data;
  }

  /**
   * Logout user and revoke tokens
   */
  async logout(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      TokenManager.clearTokens();
    }
  }

  /**
   * Revoke all user tokens (security action)
   */
  async revokeAllTokens(): Promise<void> {
    await apiClient.post('/auth/revoke-all-tokens');
    TokenManager.clearTokens();
  }

  // ============================
  // PROFILE MANAGEMENT
  // ============================

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch user profile');
    }
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: ProfileUpdateData): Promise<User> {
    const response = await apiClient.put<User>('/auth/profile', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Profile update failed');
    }
    return response.data;
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: File, onProgress?: (progress: number) => void): Promise<{ avatarUrl: string }> {
    const response = await apiClient.uploadFile<{ avatarUrl: string }>('/auth/avatar', file, onProgress);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Avatar upload failed');
    }
    return response.data;
  }

  /**
   * Delete profile avatar
   */
  async deleteAvatar(): Promise<void> {
    const response = await apiClient.delete('/auth/avatar');
    if (!response.success) {
      throw new Error(response.message || 'Avatar deletion failed');
    }
  }

  // ============================
  // EMAIL VERIFICATION
  // ============================

  /**
   * Verify email address
   */
  async verifyEmail(data: EmailVerificationData): Promise<void> {
    const response = await apiClient.post('/auth/verify-email', data);
    if (!response.success) {
      throw new Error(response.message || 'Email verification failed');
    }
  }

  /**
   * Resend email verification
   */
  async resendVerification(): Promise<void> {
    const response = await apiClient.post('/auth/resend-verification');
    if (!response.success) {
      throw new Error(response.message || 'Failed to resend verification email');
    }
  }

  // ============================
  // ORGANIZATIONAL DATA
  // ============================

  /**
   * Get all departments for registration
   */
  async getDepartments(): Promise<Department[]> {
    const response = await apiClient.get<Department[]>('/departments');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch departments');
    }
    return response.data;
  }

  /**
   * Get all job positions for registration
   */
  async getJobPositions(departmentId?: string): Promise<JobPosition[]> {
    const url = departmentId 
      ? `/job-positions?departmentId=${departmentId}`
      : '/job-positions';
    
    const response = await apiClient.get<JobPosition[]>(url);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch job positions');
    }
    return response.data;
  }

  // ============================
  // UTILITY METHODS
  // ============================

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return TokenManager.hasValidTokens();
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return TokenManager.getAccessToken();
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return TokenManager.getRefreshToken();
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    TokenManager.clearTokens();
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;