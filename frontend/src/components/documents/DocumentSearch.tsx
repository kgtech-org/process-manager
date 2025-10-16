'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { DocumentStatus, DocumentFilter } from '@/lib/resources';

interface DocumentSearchProps {
  onSearch: (filters: DocumentFilter) => void;
  initialFilters?: DocumentFilter;
}

const statusOptions: DocumentStatus[] = [
  'draft',
  'author_review',
  'author_signed',
  'verifier_review',
  'verifier_signed',
  'validator_review',
  'approved',
  'archived',
];

export function DocumentSearch({ onSearch, initialFilters = {} }: DocumentSearchProps) {
  const { t } = useTranslation('documents');
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [status, setStatus] = useState<DocumentStatus | 'all'>(initialFilters.status || 'all');

  // Debounced search - triggers automatically after 500ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: DocumentFilter = {
        search: searchQuery || undefined,
        status: status !== 'all' ? status : undefined,
      };
      onSearch(filters);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, status, onSearch]);

  const handleReset = () => {
    setSearchQuery('');
    setStatus('all');
  };

  const hasActiveFilters = searchQuery || status !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={(value) => setStatus(value as DocumentStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder={t('allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allStatuses')}</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`status.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button onClick={handleReset} variant="outline">
          <X className="h-4 w-4 mr-2" />
          {t('reset')}
        </Button>
      )}
    </div>
  );
}
