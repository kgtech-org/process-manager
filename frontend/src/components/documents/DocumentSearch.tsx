'use client';

import { useState } from 'react';
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
import type { DocumentStatus, DocumentFilter } from '@/lib/resources';

interface DocumentSearchProps {
  onSearch: (filters: DocumentFilter) => void;
  initialFilters?: DocumentFilter;
}

const statusOptions: { value: DocumentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'author_review', label: 'Author Review' },
  { value: 'author_signed', label: 'Author Signed' },
  { value: 'verifier_review', label: 'Verifier Review' },
  { value: 'verifier_signed', label: 'Verifier Signed' },
  { value: 'validator_review', label: 'Validator Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
];

export function DocumentSearch({ onSearch, initialFilters = {} }: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
  const [status, setStatus] = useState<DocumentStatus | 'all'>(initialFilters.status || 'all');

  const handleSearch = () => {
    const filters: DocumentFilter = {
      search: searchQuery || undefined,
      status: status !== 'all' ? status : undefined,
    };
    onSearch(filters);
  };

  const handleReset = () => {
    setSearchQuery('');
    setStatus('all');
    onSearch({});
  };

  const hasActiveFilters = searchQuery || status !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents by title or reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={(value) => setStatus(value as DocumentStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button onClick={handleSearch} className="flex-1 sm:flex-none">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        {hasActiveFilters && (
          <Button onClick={handleReset} variant="outline" className="flex-1 sm:flex-none">
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
