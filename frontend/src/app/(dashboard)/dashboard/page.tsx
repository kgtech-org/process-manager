'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { ActivityLogResource } from '@/lib/resources/activity-log';
import type { ActivityLog, ActivityAction, ActivityCategory } from '@/types/activity-log';
import { PendingInvitationsWidget } from '@/components/invitations';

interface DashboardStats {
  totalUsers: number;
  pendingUsers: number;
  activeUsers: number;
  totalDepartments: number;
  activeDepartments: number;
  totalJobPositions: number;
  recentActivity: ActivityItem[];
  usersByRole: Record<string, number>;
  jobPositionsByLevel: Record<string, number>;
  departmentHierarchy: {
    rootDepartments: number;
    withSubDepartments: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'user_registered' | 'user_approved' | 'user_rejected' | 'department_created';
  description: string;
  timestamp: string;
  actor?: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const { t: tActivity } = useTranslation('activity');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingUsers: 0,
    activeUsers: 0,
    totalDepartments: 0,
    activeDepartments: 0,
    totalJobPositions: 0,
    recentActivity: [],
    usersByRole: {},
    jobPositionsByLevel: {},
    departmentHierarchy: {
      rootDepartments: 0,
      withSubDepartments: 0,
    },
  });
  const [recentActivityLogs, setRecentActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashboardStats = await dashboardApi.getStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Keep placeholder data on error
        setStats({
          totalUsers: 0,
          pendingUsers: 0,
          activeUsers: 0,
          totalDepartments: 0,
          activeDepartments: 0,
          totalJobPositions: 0,
          recentActivity: [],
          usersByRole: {},
          jobPositionsByLevel: {},
          departmentHierarchy: {
            rootDepartments: 0,
            withSubDepartments: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentActivity = async () => {
      try {
        // Fetch recent activity logs
        const response = await ActivityLogResource.getMy({
          limit: 10,
          page: 1
        });
        setRecentActivityLogs(response.data);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        // Try to fetch all activity if user is admin
        if (user?.role === 'admin') {
          try {
            const response = await ActivityLogResource.getAll({
              limit: 10,
              page: 1
            });
            setRecentActivityLogs(response.data);
          } catch (adminError) {
            console.error('Failed to fetch admin activity logs:', adminError);
          }
        }
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchDashboardData();
    fetchRecentActivity();
  }, [user?.role]);

  const getActivityIcon = (action: ActivityAction, success: boolean = true) => {
    // Error state icon
    if (!success) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    // Success state icons based on action
    switch (action) {
      case 'user_login':
      case 'user_logout':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'user_registered':
      case 'user_approved':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'user_rejected':
      case 'user_deactivated':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        );
      case 'department_created':
      case 'department_updated':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'job_position_created':
      case 'job_position_updated':
        return (
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
          </svg>
        );
      case 'login_failed':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getActivityBadge = (action: ActivityAction, success: boolean = true) => {
    const actionKey = `actions.${action}`;
    const actionLabel = tActivity(actionKey, { defaultValue: action.replace(/_/g, ' ') });

    if (!success) {
      return <Badge variant="destructive">{actionLabel}</Badge>;
    }

    // Color coding based on action type
    if (action.includes('login') || action.includes('logout')) {
      return <Badge variant="outline" className="text-gray-600 border-gray-200">{actionLabel}</Badge>;
    } else if (action.includes('approved') || action.includes('activated')) {
      return <Badge variant="outline" className="text-green-600 border-green-200">{actionLabel}</Badge>;
    } else if (action.includes('rejected') || action.includes('failed') || action.includes('deactivated')) {
      return <Badge variant="outline" className="text-red-600 border-red-200">{actionLabel}</Badge>;
    } else if (action.includes('department')) {
      return <Badge variant="outline" className="text-purple-600 border-purple-200">{actionLabel}</Badge>;
    } else if (action.includes('job_position')) {
      return <Badge variant="outline" className="text-indigo-600 border-indigo-200">{actionLabel}</Badge>;
    } else {
      return <Badge variant="outline" className="text-blue-600 border-blue-200">{actionLabel}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return tActivity('list.justNow');
    } else if (diffMins < 60) {
      return tActivity(diffMins === 1 ? 'list.minuteAgo' : 'list.minutesAgo', { count: diffMins });
    } else if (diffHours < 24) {
      return tActivity(diffHours === 1 ? 'list.hourAgo' : 'list.hoursAgo', { count: diffHours });
    } else if (diffDays < 7) {
      return tActivity(diffDays === 1 ? 'list.dayAgo' : 'list.daysAgo', { count: diffDays });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('welcome', { name: user?.firstName })}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalUsers')}</CardTitle>
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">{t('stats.activeCount', { count: stats.activeUsers })}</span> •
              <span className="text-yellow-600 ml-1">{t('stats.pendingCount', { count: stats.pendingUsers })}</span>
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.pendingApprovals')}</CardTitle>
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingUsers}</div>
            <p className="text-xs text-gray-600">
              {t('stats.pendingApprovalsDesc')}
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeUsers')}</CardTitle>
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-gray-600">
              {t('stats.activeUsersDesc')}
            </p>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.departments')}</CardTitle>
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDepartments}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600">{t('stats.activeCount', { count: stats.activeDepartments })}</span>
            </p>
          </CardContent>
        </Card>

        {/* Job Positions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.jobPositions')}</CardTitle>
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobPositions}</div>
            <p className="text-xs text-gray-600">
              {t('stats.jobPositionsDesc')}
            </p>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.systemStatus')}</CardTitle>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{t('stats.healthy')}</div>
            <p className="text-xs text-gray-600">
              {t('stats.allSystemsOperational')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations Widget */}
      <div className="mb-8">
        <PendingInvitationsWidget />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('recentActivity')}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
          </div>
          <Link href={user?.role === 'admin' ? '/admin/activity-logs' : '/activity-logs'}>
            <Button variant="outline" size="sm">
              {t('viewAll')}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start space-x-3 p-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivityLogs.length > 0 ? (
            <div className="space-y-4">
              {recentActivityLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(log.action, log.success)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {log.description}
                      </p>
                      {getActivityBadge(log.action, log.success)}
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <span>{formatTimestamp(log.timestamp)}</span>
                      {log.actorName && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{log.actorName}</span>
                        </>
                      )}
                      {log.ipAddress && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{log.ipAddress}</span>
                        </>
                      )}
                    </div>
                    {log.errorMessage && !log.success && (
                      <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">{t('noRecentActivity')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}