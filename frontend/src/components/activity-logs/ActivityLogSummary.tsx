'use client';

import React from 'react';
import { ActivityLogSummary, ActivityLogStats, getCategoryLabel } from '@/types/activity-log';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityLogSummaryProps {
  summary?: ActivityLogSummary;
  stats?: ActivityLogStats;
  loading?: boolean;
}

export const ActivityLogSummaryCard: React.FC<ActivityLogSummaryProps> = ({
  summary,
  stats,
  loading = false
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No activity data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = summary ? Math.round((summary.successful / summary.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Activity Summary
            {summary && (
              <Badge variant="outline" className="text-xs">
                Last {summary.periodDays} days
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Activities */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary?.total || stats?.total || 0}
              </div>
              <div className="text-sm text-gray-600">Total Activities</div>
            </div>

            {/* Success Rate */}
            {summary && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {successRate}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            )}

            {/* Failed Activities */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary?.failed || stats?.failed24h || 0}
              </div>
              <div className="text-sm text-gray-600">
                {summary ? 'Failed' : 'Failed (24h)'}
              </div>
            </div>

            {/* Recent Activities */}
            {stats && (
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.last24Hours}
                </div>
                <div className="text-sm text-gray-600">Last 24h</div>
              </div>
            )}
          </div>

          {/* Success/Failed Breakdown */}
          {summary && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Success vs Failed</span>
                <span>{summary.successful} / {summary.failed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${successRate}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => {
                  const percentage = Math.round((count / summary.total) * 100);
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">
                          {getCategoryLabel(category as any)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{count}</span>
                        <Badge variant="outline" className="text-xs">
                          {percentage}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};