'use client';

import React, { useState, useEffect } from 'react';
import { ActivityLogResource } from '@/lib/resources/activity-log';
import { ActivityLogFilters, ActivityLog, PaginatedActivityLogs } from '@/types/activity-log';
import { ActivityLogList } from './ActivityLogList';
import { ActivityLogFilters as FiltersComponent } from './ActivityLogFilters';
import { ActivityLogSummaryCard } from './ActivityLogSummary';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomPagination } from '@/components/ui/custom-pagination';
import { useTranslation } from '@/lib/i18n';

interface ActivityLogsPageProps {
  showFilters?: boolean;
  showSummary?: boolean;
  isAdminView?: boolean;
  userId?: string; // For viewing specific user's logs
}

export const ActivityLogsPage: React.FC<ActivityLogsPageProps> = ({
  showFilters = true,
  showSummary = true,
  isAdminView = false,
  userId
}) => {
  const { t } = useTranslation('activity');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    limit: 20,
    ...(userId && { userId })
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [groupByDate, setGroupByDate] = useState(true);

  // Load activity logs
  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let result: PaginatedActivityLogs;

      if (searchTerm.trim()) {
        result = await ActivityLogResource.search(searchTerm, filters);
      } else if (isAdminView) {
        result = await ActivityLogResource.getAll(filters);
      } else {
        result = await ActivityLogResource.getMy(filters);
      }

      setLogs(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  // Load summary data
  const loadSummary = async () => {
    if (!showSummary) return;

    try {
      if (isAdminView) {
        const statsData = await ActivityLogResource.getStats();
        setStats(statsData);
      } else {
        const summaryData = await ActivityLogResource.getMySummary(30);
        setSummary(summaryData);
      }
    } catch (err) {
      console.warn('Failed to load summary data:', err);
    }
  };

  useEffect(() => {
    loadActivityLogs();
  }, [filters, searchTerm]);

  useEffect(() => {
    loadSummary();
  }, []);

  const handleFiltersChange = (newFilters: ActivityLogFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handleClearFilters = () => {
    const baseFilters: ActivityLogFilters = {
      page: 1,
      limit: 20,
      ...(userId && { userId })
    };
    setFilters(baseFilters);
    setSearchTerm('');
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleExportCSV = async () => {
    try {
      const csvContent = await ActivityLogResource.exportToCsv(filters);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export activity logs');
    }
  };

  const getActiveFiltersCount = (): number => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'page' || key === 'limit' || (key === 'userId' && userId)) return false;
      return value !== undefined && value !== '';
    }).length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-red-900 mb-2">{t('error.title')}</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => loadActivityLogs()}>
              {t('error.tryAgain')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userId ? t('title.userLogs') : isAdminView ? t('title.allLogs') : t('title.myLogs')}
          </h1>
          <p className="text-gray-600">
            {userId ? t('subtitle.userLogs') :
             isAdminView ? t('subtitle.allLogs') :
             t('subtitle.myLogs')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={loading || logs.length === 0}
          >
            {t('actions.exportCsv')}
          </Button>
          {showFilters && (
            <Button
              variant={showFiltersPanel ? "default" : "outline"}
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              {t('filters.title')}
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {showSummary && (
        <ActivityLogSummaryCard
          summary={summary}
          stats={stats}
          loading={loading && !logs.length}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {showFilters && showFiltersPanel && (
          <div className="lg:col-span-1">
            <FiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              loading={loading}
            />
          </div>
        )}

        {/* Main Content */}
        <div className={showFilters && showFiltersPanel ? "lg:col-span-3" : "lg:col-span-4"}>
          {/* Search and Controls */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Select
                    value={groupByDate ? "grouped" : "list"}
                    onValueChange={(value) => setGroupByDate(value === "grouped")}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grouped">{t('views.groupedByDate')}</SelectItem>
                      <SelectItem value="list">{t('views.simpleList')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.limit?.toString() || "20"}
                    onValueChange={(value) => handleFiltersChange({ ...filters, limit: parseInt(value), page: 1 })}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">{t('pagination.perPage', { count: 10 })}</SelectItem>
                      <SelectItem value="20">{t('pagination.perPage', { count: 20 })}</SelectItem>
                      <SelectItem value="50">{t('pagination.perPage', { count: 50 })}</SelectItem>
                      <SelectItem value="100">{t('pagination.perPage', { count: 100 })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Logs List */}
          <ActivityLogList
            logs={logs}
            loading={loading}
            showUser={isAdminView}
            groupByDate={groupByDate}
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <CustomPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};