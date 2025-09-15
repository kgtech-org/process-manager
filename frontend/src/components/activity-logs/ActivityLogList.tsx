'use client';

import React from 'react';
import { ActivityLog } from '@/types/activity-log';
import { ActivityLogItem } from './ActivityLogItem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ActivityLogListProps {
  logs: ActivityLog[];
  loading?: boolean;
  showUser?: boolean;
  groupByDate?: boolean;
}

export const ActivityLogList: React.FC<ActivityLogListProps> = ({
  logs,
  loading = false,
  showUser = true,
  groupByDate = false
}) => {
  const groupLogsByDate = (logs: ActivityLog[]) => {
    const grouped: Record<string, ActivityLog[]> = {};

    logs.forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });

    return grouped;
  };

  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-gray-600">Loading activity logs...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logs found</h3>
            <p className="text-gray-600">There are no activity logs to display for the selected filters.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groupByDate) {
    const groupedLogs = groupLogsByDate(logs);
    const sortedDates = Object.keys(groupedLogs).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    return (
      <div className="space-y-6">
        {sortedDates.map(date => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-gray-900">
                {formatDateHeader(date)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {groupedLogs[date]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map(log => (
                    <ActivityLogItem
                      key={log.id}
                      log={log}
                      showUser={showUser}
                    />
                  ))
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {logs.map(log => (
            <ActivityLogItem
              key={log.id}
              log={log}
              showUser={showUser}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};