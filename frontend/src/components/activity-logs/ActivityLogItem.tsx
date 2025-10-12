'use client';

import React from 'react';
import { ActivityLog, getLevelColor, getLevelIcon, getActionLabel, getCategoryLabel } from '@/types/activity-log';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ActivityLogItemProps {
  log: ActivityLog;
  showUser?: boolean;
}

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log, showUser = true }) => {
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now.getTime() - logTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      case 'audit': return 'secondary';
      default: return 'default';
    }
  };

  const getSuccessColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="flex items-start space-x-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Level Icon */}
      <div className="flex-shrink-0 mt-1">
        <span className="text-lg">{getLevelIcon(log.level)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {showUser && (
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  {log.actorAvatar && (
                    <AvatarImage src={log.actorAvatar} alt={log.actorName} />
                  )}
                  <AvatarFallback className="text-xs font-medium">
                    {log.actorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-900">
                  {log.actorName}
                </span>
              </div>
            )}
            <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
              {log.level.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getCategoryLabel(log.category)}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-medium ${getSuccessColor(log.success)}`}>
              {log.success ? '✓' : '✗'}
            </span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(log.timestamp)}
            </span>
          </div>
        </div>

        {/* Action and Description */}
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-900">
            {getActionLabel(log.action)}
          </span>
          {log.description && (
            <p className="text-sm text-gray-600 mt-1">
              {log.description}
            </p>
          )}
        </div>

        {/* Target Information */}
        {log.targetName && (
          <div className="text-xs text-gray-500">
            Target: <span className="font-medium">{log.targetName}</span>
          </div>
        )}

        {/* Error Message */}
        {!log.success && log.errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {log.errorMessage}
          </div>
        )}

        {/* Additional Details */}
        {log.ipAddress && (
          <div className="text-xs text-gray-400 mt-1">
            IP: {log.ipAddress}
            {log.duration && ` • Duration: ${log.duration}ms`}
          </div>
        )}
      </div>
    </div>
  );
};