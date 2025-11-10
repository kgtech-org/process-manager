'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { MacroFilter } from '@/types/macro';

interface MacroSearchProps {
  onSearch: (filters: MacroFilter) => void;
  initialFilters?: MacroFilter;
}

export function MacroSearch({ onSearch, initialFilters = {} }: MacroSearchProps) {
  const { t } = useTranslation('macros');
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');

  // Debounced search - triggers automatically after 500ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: MacroFilter = {};

      // Only add properties if they have values
      if (searchQuery) {
        filters.search = searchQuery;
      }

      onSearch(filters);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleReset = () => {
    setSearchQuery('');
  };

  const hasActiveFilters = searchQuery !== '';

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
      {hasActiveFilters && (
        <Button onClick={handleReset} variant="outline">
          <X className="h-4 w-4 mr-2" />
          {t('reset')}
        </Button>
      )}
    </div>
  );
}
