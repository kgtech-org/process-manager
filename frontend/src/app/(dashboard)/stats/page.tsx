'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { DocumentResource } from '@/lib/resources/document';
import { InvitationResource } from '@/lib/resources/invitation';

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

export default function StatsPage() {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
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
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    myDocuments: 0,
    pendingInvitations: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashboardStats = await dashboardApi.getStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
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

    const fetchUserStats = async () => {
      if (user?.role === 'admin') {
        return; // Admin sees system stats, not user stats
      }

      try {
        // Fetch user's documents count
        const documentsResponse = await DocumentResource.getPaginated({ page: 1, limit: 1 });

        // Fetch pending invitations count
        const invitationsResponse = await InvitationResource.list({
          page: 1,
          limit: 1,
          status: 'pending',
          forMe: true
        });

        setUserStats({
          myDocuments: documentsResponse.pagination?.total || 0,
          pendingInvitations: invitationsResponse.pagination?.total || 0,
        });
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };

    fetchDashboardData();
    fetchUserStats();
  }, [user?.role]);

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

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('stats.title', { defaultValue: 'Statistics' })}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('stats.subtitle', { defaultValue: 'Overview of key metrics and statistics' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin ? (
          <>
            {/* Total Users - Admin Only */}
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

            {/* Pending Approvals - Admin Only */}
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

            {/* Active Users - Admin Only */}
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

            {/* Departments - Admin Only */}
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

            {/* Job Positions - Admin Only */}
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

            {/* System Status - Admin Only */}
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
          </>
        ) : (
          <>
            {/* User-focused stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.myDocuments')}</CardTitle>
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.myDocuments}</div>
                <p className="text-xs text-gray-600">
                  {t('stats.myDocumentsDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.pendingInvitations')}</CardTitle>
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.pendingInvitations}</div>
                <p className="text-xs text-gray-600">
                  {t('stats.pendingInvitationsDesc')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('stats.quickActions')}</CardTitle>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/documents/new">
                    <Button variant="outline" size="sm" className="w-full">
                      {t('stats.createDocument', { defaultValue: 'Create Document' })}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
