'use client';

import React from 'react';
import { ActivityLogFilters as IActivityLogFilters, ACTIVITY_CATEGORIES, ACTIVITY_LEVELS, ActivityCategory, ActivityLevel } from '@/types/activity-log';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ActivityLogFiltersProps {
  filters: IActivityLogFilters;
  onFiltersChange: (filters: IActivityLogFilters) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const ActivityLogFilters: React.FC<ActivityLogFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  loading = false
}) => {
  const handleFilterChange = (key: keyof IActivityLogFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getActiveFiltersCount = (): number => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'page' || key === 'limit') return false;
      return value !== undefined && value !== '';
    }).length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Filters</CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              disabled={loading || activeFiltersCount === 0}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateFrom" className="text-sm font-medium">
              From Date
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom ? filters.dateFrom.split('T')[0] : ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-sm font-medium">
              To Date
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo ? filters.dateTo.split('T')[0] : ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <Label className="text-sm font-medium">Category</Label>
          <Select
            value={filters.category || ''}
            onValueChange={(value) => handleFilterChange('category', value || undefined)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {ACTIVITY_CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full bg-${category.color}-500`}></div>
                    <span>{category.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Level Filter */}
        <div>
          <Label className="text-sm font-medium">Level</Label>
          <Select
            value={filters.level || ''}
            onValueChange={(value) => handleFilterChange('level', value || undefined)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Levels</SelectItem>
              {ACTIVITY_LEVELS.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  <div className="flex items-center space-x-2">
                    <span>{level.icon}</span>
                    <span>{level.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Success Filter */}
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Select
            value={filters.success !== undefined ? filters.success.toString() : ''}
            onValueChange={(value) => handleFilterChange('success', value ? value === 'true' : undefined)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="true">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Success</span>
                </div>
              </SelectItem>
              <SelectItem value="false">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">✗</span>
                  <span>Failed</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User ID Filter (for admin use) */}
        <div>
          <Label htmlFor="userId" className="text-sm font-medium">
            User ID
          </Label>
          <Input
            id="userId"
            placeholder="Enter user ID"
            value={filters.userId || ''}
            onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
            disabled={loading}
          />
        </div>

        {/* IP Address Filter */}
        <div>
          <Label htmlFor="ipAddress" className="text-sm font-medium">
            IP Address
          </Label>
          <Input
            id="ipAddress"
            placeholder="Enter IP address"
            value={filters.ipAddress || ''}
            onChange={(e) => handleFilterChange('ipAddress', e.target.value || undefined)}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
};