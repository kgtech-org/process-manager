import React from 'react';
import { ActivityLogsPage } from '@/components/activity-logs';
import { AdminGuard } from '@/components/auth/AdminGuard';

export default function AdminActivityLogsPage() {
  return (
    <AdminGuard>
      <div className="p-6">
        <ActivityLogsPage
          isAdminView={true}
          showFilters={true}
          showSummary={true}
        />
      </div>
    </AdminGuard>
  );
}