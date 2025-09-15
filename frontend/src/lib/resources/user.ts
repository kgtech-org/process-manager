import { apiClient } from '../api';

// User types based on the backend schema
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'manager' | 'user';
  status: 'pending' | 'active' | 'inactive';
  departmentId?: string;
  jobPositionId?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  jobPosition?: {
    id: string;
    title: string;
    code: string;
  };
  avatarUrl?: string;
  emailVerified: boolean;
  lastLogin?: string;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'active' | 'inactive';
  role?: 'admin' | 'manager' | 'user';
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationData;
}

export interface UserValidationData {
  action: 'approve' | 'reject';
  role?: 'admin' | 'manager' | 'user';
  reason?: string;
}

export interface UserUpdateData {
  name?: string;
  phone?: string;
  departmentId?: string;
  jobPositionId?: string;
}

// User Resource API
export class UserResource {
  /**
   * Get all users with optional filters
   */
  static async getAll(filters?: UserFilters): Promise<User[]> {
    const queryParams = new URLSearchParams();

    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.role) queryParams.append('role', filters.role);

    const query = queryParams.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);
    return response.data || [];
  }

  /**
   * Get paginated users with optional filters
   */
  static async getPaginated(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();

    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.role) queryParams.append('role', filters.role);

    const query = queryParams.toString();
    const response = await apiClient.get(`/users${query ? `?${query}` : ''}`);

    return {
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
      }
    };
  }

  /**
   * Get a specific user by ID
   */
  static async getById(userId: string): Promise<User> {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * Validate user (approve/reject pending registration)
   */
  static async validate(userId: string, data: UserValidationData): Promise<User> {
    const response = await apiClient.put(`/users/${userId}/validate`, data);
    return response.data;
  }

  /**
   * Update user information
   */
  static async update(userId: string, data: UserUpdateData): Promise<User> {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  }

  /**
   * Delete user (soft delete)
   */
  static async delete(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  /**
   * Activate user account
   */
  static async activate(userId: string): Promise<User> {
    const response = await apiClient.put(`/users/${userId}/activate`);
    return response.data;
  }

  /**
   * Deactivate user account
   */
  static async deactivate(userId: string): Promise<User> {
    const response = await apiClient.put(`/users/${userId}/deactivate`);
    return response.data;
  }

  /**
   * Update user role
   */
  static async updateRole(userId: string, role: 'admin' | 'manager' | 'user'): Promise<User> {
    const response = await apiClient.put(`/users/${userId}/role`, { role });
    return response.data;
  }

  /**
   * Get users by status
   */
  static async getByStatus(status: 'pending' | 'active' | 'inactive'): Promise<User[]> {
    return this.getAll({ status });
  }

  /**
   * Get pending users (awaiting approval)
   */
  static async getPending(): Promise<User[]> {
    return this.getByStatus('pending');
  }

  /**
   * Get active users
   */
  static async getActive(): Promise<User[]> {
    return this.getByStatus('active');
  }

  /**
   * Get users by role
   */
  static async getByRole(role: 'admin' | 'manager' | 'user'): Promise<User[]> {
    return this.getAll({ role });
  }

  /**
   * Get user statistics
   */
  static async getStats(): Promise<{
    total: number;
    pending: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    const users = await this.getAll();

    const stats = {
      total: users.length,
      pending: users.filter(u => u.status === 'pending').length,
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        manager: users.filter(u => u.role === 'manager').length,
        user: users.filter(u => u.role === 'user').length,
      },
    };

    return stats;
  }
}