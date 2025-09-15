import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Base Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

// Token Management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static hasValidTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}

// API Error Types
export interface ApiError {
  message: string;
  field?: string;
  code?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Axios Instance with Interceptors
class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: string) => void;
    reject: (error: any) => void;
  }> = [];
  private refreshPromise: Promise<string> | null = null;
  private tokenRefreshCallback: ((newToken: string) => void) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.startTokenRefreshTimer();
  }

  // Set callback to notify auth context when token is refreshed
  setTokenRefreshCallback(callback: (newToken: string) => void) {
    this.tokenRefreshCallback = callback;
  }

  private setupInterceptors() {
    // Request Interceptor - Add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = TokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor - Handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors - token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          return this.handleTokenRefresh(originalRequest, error);
        }

        return Promise.reject(error);
      }
    );
  }

  // Enhanced token refresh handling
  private async handleTokenRefresh(originalRequest: any, error: any): Promise<any> {
    // If already refreshing, queue the request
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise.then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return this.instance(originalRequest);
      }).catch(() => Promise.reject(error));
    }

    // If refresh is in progress but no promise, queue it
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return this.instance(originalRequest);
      }).catch(() => Promise.reject(error));
    }

    // Start refresh process
    originalRequest._retry = true;
    this.isRefreshing = true;

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;

      // Process queued requests
      this.failedQueue.forEach(({ resolve }) => resolve(newToken));
      this.failedQueue = [];

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return this.instance(originalRequest);
    } catch (refreshError) {
      // Refresh failed - clear tokens and redirect to login
      this.failedQueue.forEach(({ reject }) => reject(refreshError));
      this.failedQueue = [];
      this.handleRefreshFailure();
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Create a new axios instance to avoid interceptor recursion
    const refreshInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 5000,
    });

    const response = await refreshInstance.post('/auth/refresh', {
      refreshToken: refreshToken,
    });

    if (!response.data?.success || !response.data?.data) {
      throw new Error('Token refresh failed');
    }

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    TokenManager.setTokens(accessToken, newRefreshToken);

    // Notify auth context about token refresh
    if (this.tokenRefreshCallback) {
      this.tokenRefreshCallback(accessToken);
    }

    return accessToken;
  }

  private handleRefreshFailure(): void {
    TokenManager.clearTokens();

    // Notify auth context about token failure
    if (this.tokenRefreshCallback) {
      this.tokenRefreshCallback('');
    }

    if (typeof window !== 'undefined') {
      // Use router instead of direct location change for better UX
      const event = new CustomEvent('auth:logout');
      window.dispatchEvent(event);
    }
  }

  // Proactive token refresh - refresh token before it expires
  private startTokenRefreshTimer(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      this.checkAndRefreshToken();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async checkAndRefreshToken(): Promise<void> {
    const token = TokenManager.getAccessToken();
    if (!token || this.isRefreshing) return;

    try {
      // Decode JWT to check expiration (simple implementation)
      const payload = this.decodeJWTPayload(token);
      if (!payload?.exp) return;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      // Refresh if token expires within next 10 minutes
      if (timeUntilExpiry < 600) {
        console.log('Proactively refreshing token');
        await this.performTokenRefresh();
      }
    } catch (error) {
      console.warn('Token check failed:', error);
    }
  }

  private decodeJWTPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  // Public method to manually refresh token
  async refreshToken(): Promise<void> {
    if (this.isRefreshing) return;
    await this.performTokenRefresh();
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  // File Upload
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.instance.post(url, formData, config);
    return response.data;
  }

  // Get raw axios instance for special cases
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// User Management API
export const userApi = {
  // Get all users with optional filters
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'active' | 'inactive';
    role?: 'admin' | 'manager' | 'user';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.role) queryParams.append('role', params.role);

    const query = queryParams.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Get specific user
  getUser: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  // Validate user (approve/reject)
  validateUser: async (userId: string, data: {
    action: 'approve' | 'reject';
    role?: 'admin' | 'manager' | 'user';
    reason?: string;
  }) => {
    const response = await apiClient.put(`/users/${userId}/validate`, data);
    return response.data;
  },

  // Update user
  updateUser: async (userId: string, data: any) => {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string) => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },

  // Activate user
  activateUser: async (userId: string) => {
    const response = await apiClient.put(`/users/${userId}/activate`);
    return response.data;
  },

  // Deactivate user
  deactivateUser: async (userId: string) => {
    const response = await apiClient.put(`/users/${userId}/deactivate`);
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId: string, role: 'admin' | 'manager' | 'user') => {
    const response = await apiClient.put(`/users/${userId}/role`, { role });
    return response.data;
  },
};

// Department Management API
export const departmentApi = {
  // Get all departments
  getDepartments: async (params?: {
    active?: boolean;
    parentId?: string | null;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.parentId !== undefined) queryParams.append('parentId', params.parentId || 'null');

    const query = queryParams.toString();
    const response = await apiClient.get(`/departments${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Get specific department
  getDepartment: async (departmentId: string) => {
    const response = await apiClient.get(`/departments/${departmentId}`);
    return response.data;
  },

  // Create department
  createDepartment: async (data: {
    name: string;
    code: string;
    description?: string;
    parentId?: string;
    managerId?: string;
  }) => {
    const response = await apiClient.post('/departments', data);
    return response.data;
  },

  // Update department
  updateDepartment: async (departmentId: string, data: any) => {
    const response = await apiClient.put(`/departments/${departmentId}`, data);
    return response.data;
  },

  // Delete department
  deleteDepartment: async (departmentId: string) => {
    const response = await apiClient.delete(`/departments/${departmentId}`);
    return response.data;
  },
};

// Job Position Management API
export const jobPositionApi = {
  // Get all job positions
  getJobPositions: async (params?: {
    active?: boolean;
    departmentId?: string;
    level?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params?.level) queryParams.append('level', params.level);

    const query = queryParams.toString();
    const response = await apiClient.get(`/job-positions${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Get specific job position
  getJobPosition: async (positionId: string) => {
    const response = await apiClient.get(`/job-positions/${positionId}`);
    return response.data;
  },

  // Create job position
  createJobPosition: async (data: {
    title: string;
    code: string;
    description?: string;
    departmentId: string;
    level: string;
    requiredSkills: string[];
  }) => {
    const response = await apiClient.post('/job-positions', data);
    return response.data;
  },

  // Update job position
  updateJobPosition: async (positionId: string, data: any) => {
    const response = await apiClient.put(`/job-positions/${positionId}`, data);
    return response.data;
  },

  // Delete job position
  deleteJobPosition: async (positionId: string) => {
    const response = await apiClient.delete(`/job-positions/${positionId}`);
    return response.data;
  },
};

// Dashboard Statistics API using Resource classes
export const dashboardApi = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      // Import resource classes dynamically to avoid circular imports
      const { UserResource } = await import('./resources/user');
      const { DepartmentResource } = await import('./resources/department');
      const { JobPositionResource } = await import('./resources/jobPosition');

      // Fetch all statistics in parallel
      const [userStats, departmentStats, jobPositionStats, recentUsers] = await Promise.all([
        UserResource.getStats(),
        DepartmentResource.getStats(),
        JobPositionResource.getStats(),
        UserResource.getAll({ limit: 10 }), // Get recent users for activity
      ]);

      // Generate recent activity from users
      const recentActivity = recentUsers
        .slice(0, 5)
        .map((user: any) => ({
          id: user.id,
          type: (user.status === 'pending' ? 'user_registered' : 'user_approved') as 'user_registered' | 'user_approved' | 'user_rejected' | 'department_created',
          description: `User ${user.status === 'pending' ? 'registration' : 'activity'}: ${user.email}`,
          timestamp: user.createdAt,
          actor: user.status === 'active' ? 'Admin' : undefined,
        }));

      return {
        totalUsers: userStats.total,
        pendingUsers: userStats.pending,
        activeUsers: userStats.active,
        totalDepartments: departmentStats.total,
        activeDepartments: departmentStats.active,
        totalJobPositions: jobPositionStats.total,
        recentActivity,
        // Additional detailed stats
        usersByRole: userStats.byRole,
        jobPositionsByLevel: jobPositionStats.byLevel,
        departmentHierarchy: {
          rootDepartments: departmentStats.rootDepartments,
          withSubDepartments: departmentStats.withSubDepartments,
        },
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return default values on error
      return {
        totalUsers: 0,
        pendingUsers: 0,
        activeUsers: 0,
        totalDepartments: 0,
        activeDepartments: 0,
        totalJobPositions: 0,
        recentActivity: [],
        usersByRole: { admin: 0, manager: 0, user: 0 },
        jobPositionsByLevel: {},
        departmentHierarchy: { rootDepartments: 0, withSubDepartments: 0 },
      };
    }
  },
};

export { TokenManager };
export default apiClient;