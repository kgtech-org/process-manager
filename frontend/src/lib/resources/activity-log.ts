import { apiClient } from '../api';
import type {
  ActivityLog,
  ActivityLogFilters,
  ActivityLogSummary,
  ActivityLogStats,
  PaginatedActivityLogs,
} from '@/types/activity-log';

// Activity Log Resource API
export class ActivityLogResource {
  /**
   * Get all activity logs (admin only)
   */
  static async getAll(filters?: ActivityLogFilters): Promise<PaginatedActivityLogs> {
    const queryParams = new URLSearchParams();

    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.userId) queryParams.append('userId', filters.userId);
    if (filters?.targetUserId) queryParams.append('targetUserId', filters.targetUserId);
    if (filters?.action) queryParams.append('action', filters.action);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.level) queryParams.append('level', filters.level);
    if (filters?.resourceType) queryParams.append('resourceType', filters.resourceType);
    if (filters?.resourceId) queryParams.append('resourceId', filters.resourceId);
    if (filters?.success !== undefined) queryParams.append('success', filters.success.toString());
    if (filters?.ipAddress) queryParams.append('ipAddress', filters.ipAddress);
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const query = queryParams.toString();
    const response = await apiClient.get(`/activity-logs${query ? `?${query}` : ''}`);

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
   * Get a specific activity log by ID (admin only)
   */
  static async getById(id: string): Promise<ActivityLog> {
    const response = await apiClient.get(`/activity-logs/${id}`);
    return response.data;
  }

  /**
   * Get current user's activity logs
   */
  static async getMy(filters?: Omit<ActivityLogFilters, 'userId'>): Promise<PaginatedActivityLogs> {
    const queryParams = new URLSearchParams();

    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.action) queryParams.append('action', filters.action);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.level) queryParams.append('level', filters.level);
    if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);

    const query = queryParams.toString();
    const response = await apiClient.get(`/activity-logs/me${query ? `?${query}` : ''}`);

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
   * Get current user's activity summary
   */
  static async getMySummary(days: number = 30): Promise<ActivityLogSummary> {
    const response = await apiClient.get(`/activity-logs/me/summary?days=${days}`);
    return response.data;
  }

  /**
   * Get user's activity summary (manager+ access)
   */
  static async getUserSummary(userId: string, days: number = 30): Promise<ActivityLogSummary> {
    const response = await apiClient.get(`/activity-logs/users/${userId}/summary?days=${days}`);
    return response.data;
  }

  /**
   * Get activity log statistics (admin only)
   */
  static async getStats(): Promise<ActivityLogStats> {
    const response = await apiClient.get('/activity-logs/stats');
    return response.data;
  }

  /**
   * Create manual activity log entry (admin only)
   */
  static async create(data: {
    action: string;
    description: string;
    targetUserId?: string;
    targetName?: string;
    resourceType?: string;
    resourceId?: string;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    await apiClient.post('/activity-logs', data);
  }

  /**
   * Cleanup old activity logs (admin only)
   */
  static async cleanup(olderThanDays: number = 365): Promise<{ deletedCount: number; olderThanDays: number }> {
    const response = await apiClient.delete(`/activity-logs/cleanup?olderThanDays=${olderThanDays}`);
    return response.data;
  }

  /**
   * Get activity logs by category (helper method)
   */
  static async getByCategory(category: string, filters?: Omit<ActivityLogFilters, 'category'>): Promise<PaginatedActivityLogs> {
    return this.getAll({ ...filters, category: category as any });
  }

  /**
   * Get activity logs by level (helper method)
   */
  static async getByLevel(level: string, filters?: Omit<ActivityLogFilters, 'level'>): Promise<PaginatedActivityLogs> {
    return this.getAll({ ...filters, level: level as any });
  }

  /**
   * Get failed activity logs (helper method)
   */
  static async getFailed(filters?: Omit<ActivityLogFilters, 'success'>): Promise<PaginatedActivityLogs> {
    return this.getAll({ ...filters, success: false });
  }

  /**
   * Get successful activity logs (helper method)
   */
  static async getSuccessful(filters?: Omit<ActivityLogFilters, 'success'>): Promise<PaginatedActivityLogs> {
    return this.getAll({ ...filters, success: true });
  }

  /**
   * Get recent activity logs (last 24 hours)
   */
  static async getRecent(filters?: Omit<ActivityLogFilters, 'dateFrom'>): Promise<PaginatedActivityLogs> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.getAll({
      ...filters,
      dateFrom: yesterday.toISOString()
    });
  }

  /**
   * Get activity logs for a specific user (admin only)
   */
  static async getByUser(userId: string, filters?: Omit<ActivityLogFilters, 'userId'>): Promise<PaginatedActivityLogs> {
    return this.getAll({ ...filters, userId });
  }

  /**
   * Search activity logs by description (client-side filtering)
   */
  static async search(searchTerm: string, filters?: ActivityLogFilters): Promise<PaginatedActivityLogs> {
    const result = await this.getAll(filters);

    if (!searchTerm.trim()) {
      return result;
    }

    const filteredData = result.data.filter(log =>
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetName && log.targetName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return {
      data: filteredData,
      pagination: {
        ...result.pagination,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / (filters?.limit || 20))
      }
    };
  }

  /**
   * Get activity logs for date range
   */
  static async getByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: Omit<ActivityLogFilters, 'dateFrom' | 'dateTo'>
  ): Promise<PaginatedActivityLogs> {
    return this.getAll({
      ...filters,
      dateFrom: startDate.toISOString(),
      dateTo: endDate.toISOString()
    });
  }

  /**
   * Export activity logs (client-side CSV generation)
   */
  static async exportToCsv(filters?: ActivityLogFilters): Promise<string> {
    const result = await this.getAll({ ...filters, limit: 1000 }); // Large limit for export

    const headers = [
      'Timestamp',
      'Actor',
      'Action',
      'Category',
      'Level',
      'Description',
      'Target',
      'Success',
      'IP Address',
      'Duration (ms)'
    ];

    const rows = result.data.map(log => [
      new Date(log.timestamp).toLocaleString(),
      `${log.actorName} (${log.actorEmail})`,
      log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      log.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      log.level.toUpperCase(),
      log.description,
      log.targetName || '-',
      log.success ? 'Yes' : 'No',
      log.ipAddress || '-',
      log.duration?.toString() || '-'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(','))
      .join('\n');

    return csvContent;
  }
}