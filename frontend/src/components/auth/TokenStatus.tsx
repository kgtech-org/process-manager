'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTokenManager } from '@/hooks/useTokenManager';
import { useAuth } from '@/hooks/useAuth';
import { Clock, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface TokenStatusProps {
  showRefreshButton?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const TokenStatus: React.FC<TokenStatusProps> = ({
  showRefreshButton = true,
  showDetails = false,
  className = '',
}) => {
  const { user } = useAuth();
  const {
    refreshToken,
    isTokenValid,
    needsRefresh,
    getTimeUntilExpiry
  } = useTokenManager();

  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update time until expiry every second
  useEffect(() => {
    if (!user) return;

    const updateTime = () => {
      setTimeUntilExpiry(getTimeUntilExpiry());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [user, getTimeUntilExpiry]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshToken();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return 'Expired';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusBadge = () => {
    if (!isTokenValid()) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Invalid
        </Badge>
      );
    }

    if (needsRefresh()) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Needs Refresh
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Valid
      </Badge>
    );
  };

  if (!user) {
    return null;
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusBadge()}
        {showRefreshButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Token Status
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Time until expiry:</span>
          <span className={`font-mono ${
            timeUntilExpiry && timeUntilExpiry < 600 ? 'text-orange-600' : 'text-gray-900'
          }`}>
            {timeUntilExpiry !== null ? formatTime(timeUntilExpiry) : 'Unknown'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Valid:</span>
          <span className={isTokenValid() ? 'text-green-600' : 'text-red-600'}>
            {isTokenValid() ? 'Yes' : 'No'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Needs refresh:</span>
          <span className={needsRefresh() ? 'text-orange-600' : 'text-green-600'}>
            {needsRefresh() ? 'Yes' : 'No'}
          </span>
        </div>

        {showRefreshButton && (
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};