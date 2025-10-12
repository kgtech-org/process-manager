// Activity Log Types and Interfaces
// Mirrors the backend activity log models

export type ActivityAction =
  // User Management Actions
  | 'user_login'
  | 'user_logout'
  | 'user_registered'
  | 'user_approved'
  | 'user_rejected'
  | 'user_activated'
  | 'user_deactivated'
  | 'user_updated'
  | 'user_role_changed'
  | 'user_deleted'
  | 'user_avatar_uploaded'
  | 'user_avatar_deleted'
  // Department Management Actions
  | 'department_created'
  | 'department_updated'
  | 'department_deleted'
  // Job Position Management Actions
  | 'job_position_created'
  | 'job_position_updated'
  | 'job_position_deleted'
  // Authentication Actions
  | 'token_refreshed'
  | 'password_reset'
  | 'email_verified'
  | 'otp_requested'
  | 'otp_verified'
  | 'login_failed'
  // Document Management Actions (for future use)
  | 'document_created'
  | 'document_updated'
  | 'document_deleted'
  | 'document_signed'
  | 'document_exported'
  // Process Management Actions (for future use)
  | 'process_created'
  | 'process_updated'
  | 'process_deleted'
  | 'process_submitted'
  | 'process_approved'
  | 'process_rejected'
  // System Actions
  | 'system_maintenance'
  | 'system_backup'
  | 'config_updated';

export type ActivityLevel = 'info' | 'warning' | 'error' | 'critical' | 'audit';

export type ActivityCategory =
  | 'authentication'
  | 'user_management'
  | 'department_management'
  | 'job_position_management'
  | 'document_management'
  | 'process_management'
  | 'system'
  | 'security';

export interface ActivityLog {
  id: string;
  userId?: string;
  actorName: string;
  actorEmail: string;
  actorAvatar?: string;
  targetUserId?: string;
  targetName?: string;
  action: ActivityAction;
  category: ActivityCategory;
  level: ActivityLevel;
  description: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  timestamp: string;
  createdAt: string;
}

export interface ActivityLogFilters {
  userId?: string;
  targetUserId?: string;
  action?: ActivityAction;
  category?: ActivityCategory;
  level?: ActivityLevel;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  ipAddress?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLogSummary {
  total: number;
  successful: number;
  failed: number;
  byCategory: Record<string, number>;
  periodDays: number;
  startDate: string;
}

export interface ActivityLogStats {
  total: number;
  last24Hours: number;
  failed24h: number;
  timestamp: string;
}

export interface PaginatedActivityLogs {
  data: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Utility types for UI components
export interface ActivityLogDisplayItem extends ActivityLog {
  relativeTime: string;
  statusColor: string;
  actionIcon: string;
  categoryLabel: string;
  levelLabel: string;
}

export interface ActivityLogGrouped {
  date: string;
  logs: ActivityLogDisplayItem[];
}

// Filter options for UI components
export const ACTIVITY_ACTIONS: { value: ActivityAction; label: string; category: ActivityCategory }[] = [
  // Authentication
  { value: 'user_login', label: 'User Login', category: 'authentication' },
  { value: 'user_logout', label: 'User Logout', category: 'authentication' },
  { value: 'login_failed', label: 'Login Failed', category: 'authentication' },
  { value: 'otp_requested', label: 'OTP Requested', category: 'authentication' },
  { value: 'otp_verified', label: 'OTP Verified', category: 'authentication' },
  { value: 'token_refreshed', label: 'Token Refreshed', category: 'authentication' },

  // User Management
  { value: 'user_registered', label: 'User Registered', category: 'user_management' },
  { value: 'user_approved', label: 'User Approved', category: 'user_management' },
  { value: 'user_rejected', label: 'User Rejected', category: 'user_management' },
  { value: 'user_updated', label: 'User Updated', category: 'user_management' },
  { value: 'user_role_changed', label: 'User Role Changed', category: 'user_management' },
  { value: 'user_activated', label: 'User Activated', category: 'user_management' },
  { value: 'user_deactivated', label: 'User Deactivated', category: 'user_management' },
  { value: 'user_deleted', label: 'User Deleted', category: 'user_management' },
  { value: 'user_avatar_uploaded', label: 'Avatar Uploaded', category: 'user_management' },

  // Department Management
  { value: 'department_created', label: 'Department Created', category: 'department_management' },
  { value: 'department_updated', label: 'Department Updated', category: 'department_management' },
  { value: 'department_deleted', label: 'Department Deleted', category: 'department_management' },

  // Job Position Management
  { value: 'job_position_created', label: 'Job Position Created', category: 'job_position_management' },
  { value: 'job_position_updated', label: 'Job Position Updated', category: 'job_position_management' },
  { value: 'job_position_deleted', label: 'Job Position Deleted', category: 'job_position_management' },

  // System
  { value: 'system_maintenance', label: 'System Maintenance', category: 'system' },
  { value: 'system_backup', label: 'System Backup', category: 'system' },
  { value: 'config_updated', label: 'Config Updated', category: 'system' },
];

export const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string; color: string }[] = [
  { value: 'authentication', label: 'Authentication', color: 'blue' },
  { value: 'user_management', label: 'User Management', color: 'green' },
  { value: 'department_management', label: 'Department Management', color: 'purple' },
  { value: 'job_position_management', label: 'Job Position Management', color: 'orange' },
  { value: 'document_management', label: 'Document Management', color: 'indigo' },
  { value: 'process_management', label: 'Process Management', color: 'pink' },
  { value: 'system', label: 'System', color: 'gray' },
  { value: 'security', label: 'Security', color: 'red' },
];

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; color: string; icon: string }[] = [
  { value: 'info', label: 'Info', color: 'blue', icon: 'ℹ️' },
  { value: 'warning', label: 'Warning', color: 'yellow', icon: '⚠️' },
  { value: 'error', label: 'Error', color: 'red', icon: '❌' },
  { value: 'critical', label: 'Critical', color: 'red', icon: '🚨' },
  { value: 'audit', label: 'Audit', color: 'green', icon: '📋' },
];

// Helper functions
export const getCategoryColor = (category: ActivityCategory): string => {
  const categoryInfo = ACTIVITY_CATEGORIES.find(c => c.value === category);
  return categoryInfo?.color || 'gray';
};

export const getLevelColor = (level: ActivityLevel): string => {
  const levelInfo = ACTIVITY_LEVELS.find(l => l.value === level);
  return levelInfo?.color || 'gray';
};

export const getLevelIcon = (level: ActivityLevel): string => {
  const levelInfo = ACTIVITY_LEVELS.find(l => l.value === level);
  return levelInfo?.icon || 'ℹ️';
};

export const getActionLabel = (action: ActivityAction): string => {
  const actionInfo = ACTIVITY_ACTIONS.find(a => a.value === action);
  return actionInfo?.label || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getCategoryLabel = (category: ActivityCategory): string => {
  const categoryInfo = ACTIVITY_CATEGORIES.find(c => c.value === category);
  return categoryInfo?.label || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getLevelLabel = (level: ActivityLevel): string => {
  const levelInfo = ACTIVITY_LEVELS.find(l => l.value === level);
  return levelInfo?.label || level.charAt(0).toUpperCase() + level.slice(1);
};