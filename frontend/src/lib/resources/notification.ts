import { apiClient } from '../api';
import type { PaginationData, PaginatedResponse } from './user';

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'in_app' | 'system';
  category: 'login' | 'activity' | 'system' | 'reminder' | 'approval' | 'meeting' | 'update' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  data?: any;
  imageUrl?: string;
  actionUrl?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  type?: 'email' | 'push' | 'in_app' | 'system';
  category?: 'login' | 'activity' | 'system' | 'reminder' | 'approval' | 'meeting' | 'update' | 'alert';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  failed: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
  categories: Record<string, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface NotificationPreferencesUpdate {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  soundEnabled?: boolean;
  badgeEnabled?: boolean;
  categories?: Record<string, boolean>;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

// Notification Resource API
export class NotificationResource {
  /**
   * Get all notifications with optional filters
   */
  static async getAll(filters?: NotificationFilters): Promise<Notification[]> {
    const queryParams = new URLSearchParams();

    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.priority) queryParams.append('priority', filters.priority);

    const query = queryParams.toString();
    const response = await apiClient.get(`/notifications${query ? `?${query}` : ''}`);
    return response.data || [];
  }

  /**
   * Get paginated notifications with optional filters
   */
  static async getPaginated(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    const queryParams = new URLSearchParams();

    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.priority) queryParams.append('priority', filters.priority);

    const query = queryParams.toString();
    const response = await apiClient.get(`/notifications${query ? `?${query}` : ''}`);

    return {
      data: response.data || [],
      pagination: response.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  }

  /**
   * Get a specific notification by ID
   */
  static async getById(notificationId: string): Promise<Notification> {
    const response = await apiClient.get(`/notifications/${notificationId}`);
    return response.data;
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(notificationIds: string[]): Promise<void> {
    await apiClient.post('/notifications/mark-read', {
      notificationIds
    });
  }

  /**
   * Mark a single notification as read
   */
  static async markOneAsRead(notificationId: string): Promise<void> {
    await this.markAsRead([notificationId]);
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read');
  }

  /**
   * Delete a notification
   */
  static async delete(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }

  /**
   * Get notification statistics
   */
  static async getStats(): Promise<NotificationStats> {
    const response = await apiClient.get('/notifications/stats');
    return response.data;
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(preferences: NotificationPreferencesUpdate): Promise<NotificationPreferences> {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data;
  }

  /**
   * Send test notification
   */
  static async sendTest(): Promise<void> {
    await apiClient.post('/notifications/test');
  }

  /**
   * Get unread notifications
   */
  static async getUnread(limit?: number): Promise<Notification[]> {
    return this.getAll({ status: 'delivered', limit });
  }

  /**
   * Get notifications by type
   */
  static async getByType(type: 'email' | 'push' | 'in_app' | 'system', limit?: number): Promise<Notification[]> {
    return this.getAll({ type, limit });
  }

  /**
   * Get notifications by category
   */
  static async getByCategory(
    category: 'login' | 'activity' | 'system' | 'reminder' | 'approval' | 'meeting' | 'update' | 'alert',
    limit?: number
  ): Promise<Notification[]> {
    return this.getAll({ category, limit });
  }

  /**
   * Get notifications by priority
   */
  static async getByPriority(priority: 'low' | 'normal' | 'high' | 'urgent', limit?: number): Promise<Notification[]> {
    return this.getAll({ priority, limit });
  }

  /**
   * Get urgent notifications
   */
  static async getUrgent(limit?: number): Promise<Notification[]> {
    return this.getByPriority('urgent', limit);
  }

  /**
   * Get failed notifications
   */
  static async getFailed(limit?: number): Promise<Notification[]> {
    return this.getAll({ status: 'failed', limit });
  }
}
