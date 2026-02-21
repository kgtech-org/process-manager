'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MacroCard } from './MacroCard';
import { MacroSearch } from './MacroSearch';
import { MacroResource, type MacroFilter } from '@/lib/resources/macro';
import { DomainResource, type Domain } from '@/lib/resources/domain';
import type { Macro } from '@/types/macro';
import { Loader2, Layers, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MacroForm } from './MacroForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MacroListProps {
  initialFilters?: MacroFilter;
}

export function MacroList({ initialFilters = {} }: MacroListProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();
  const { t } = useTranslation('macros');
  const [macros, setMacros] = useState<Macro[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<MacroFilter>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const limit = 12;

  // Refs to track latest values without causing observer recreation
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const loadingMoreRef = useRef(loadingMore);

  useEffect(() => {
    hasMoreRef.current = hasMore;
    loadingRef.current = loading;
    loadingMoreRef.current = loadingMore;
  }, [hasMore, loading, loadingMore]);

  // Load domains on mount
  useEffect(() => {
    const loadDomains = async () => {
      try {
        const domainData = await DomainResource.getAll({ active: true });
        setDomains(domainData);
      } catch (error) {
        console.error('Failed to load domains', error);
      }
    };
    loadDomains();
  }, []);

  // Infinite scroll observer - only recreate when target element changes
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingRef.current &&
          !loadingMoreRef.current
        ) {
          loadMoreMacros();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [observerTarget.current]); // Only recreate when target element changes

  const loadMacros = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const response = await MacroResource.getAll({
        ...filters,
        page: 1,
        limit,
      });
      const data = response.data;
      // Filter out inactive macros for non-admin users
      const userIsAdmin = user?.role === 'admin';
      const filteredData = userIsAdmin ? data : data.filter((m: Macro) => m.isActive);
      setMacros(filteredData);
      setCurrentPage(1);
      setTotal(response.pagination.total);
      setHasMore(response.data.length === limit && response.pagination.totalPages > 1);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.loadFailed'),
        description: error.message || t('messages.loadError'),
      });
    } finally {
      setLoading(false);
    }
  }, [filters, limit, t, toast, user]);

  // Load initial macros or when filters/auth changes
  useEffect(() => {
    loadMacros(true);
  }, [loadMacros]);

  const loadMoreMacros = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await MacroResource.getAll({
        ...filters,
        page: nextPage,
        limit,
      });

      setMacros((prev) => [...prev, ...response.data]);
      setCurrentPage(nextPage);
      setHasMore(response.data.length === limit && nextPage < response.pagination.totalPages);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.loadFailed'),
        description: error.message || t('messages.loadError'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = useCallback((newFilters: MacroFilter) => {
    setFilters((prevFilters) => {
      const updatedFilters = { ...prevFilters, ...newFilters };

      // Simple equality check to prevent loops if values are identical
      if (JSON.stringify(prevFilters) === JSON.stringify(updatedFilters)) {
        return prevFilters;
      }

      return updatedFilters;
    });
    // Pagination reset is handled by loadMacros when filters change
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('messages.deleteConfirm'))) return;

    try {
      await MacroResource.delete(id);
      toast({
        title: t('messages.deleteSuccess'),
      });
      loadMacros();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.deleteFailed'),
        description: error.message || t('messages.error'),
      });
    }

  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await MacroResource.update(id, { isActive });
      toast({
        title: t('messages.updateSuccess') || 'Macro updated successfully',
      });
      // Optionally update local state to reflect change immediately or reload
      setMacros(prev => prev.map(m => m.id === id ? { ...m, isActive } : m));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.updateFailed') || 'Update failed',
        description: error.message || t('messages.error'),
      });
    }
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreateMacro = async (data: any) => {
    try {
      setIsEditing(true);
      await MacroResource.create(data);
      toast({
        title: t('messages.createSuccess') || 'Macro created successfully',
      });
      setIsCreateModalOpen(false);
      loadMacros(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.createFailed') || 'Failed to create macro',
        description: error.message || t('messages.error'),
      });
    } finally {
      setIsEditing(false);
    }
  };

  if (loading && macros.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 w-full md:w-auto">
          <MacroSearch onSearch={handleSearch} initialFilters={filters} />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Domain Filter */}
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={filters.domainId || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleSearch({ ...filters, domainId: value === 'all' ? undefined : value });
            }}
          >
            <option value="all">{t('filter.allDomains', { defaultValue: 'All Domains' })}</option>
            {domains.map(domain => (
              <option key={domain.id} value={domain.id}>
                {domain.code} - {domain.name}
              </option>
            ))}
          </select>

          {isAdmin && (
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
              onChange={(e) => {
                const value = e.target.value;
                const isActive = value === 'all' ? undefined : value === 'true';
                handleSearch({ ...filters, isActive });
              }}
            >
              <option value="all">{t('filter.all', { defaultValue: 'All Status' })}</option>
              <option value="true">{t('filter.active', { defaultValue: 'Active' })}</option>
              <option value="false">{t('filter.inactive', { defaultValue: 'Inactive' })}</option>
            </select>
          )}
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={`${filters.sortBy || 'name'}-${filters.order || 'asc'}`}
            onChange={(e) => {
              const [sortBy, order] = e.target.value.split('-');
              handleSearch({ ...filters, sortBy: sortBy as any, order: order as any });
            }}
          >
            <option value="name-asc">{t('sort.nameAsc', { defaultValue: 'Name (A-Z)' })}</option>
            <option value="name-desc">{t('sort.nameDesc', { defaultValue: 'Name (Z-A)' })}</option>
            <option value="createdAt-desc">{t('sort.newest', { defaultValue: 'Newest First' })}</option>
            <option value="createdAt-asc">{t('sort.oldest', { defaultValue: 'Oldest First' })}</option>
            <option value="updatedAt-desc">{t('sort.updated', { defaultValue: 'Recently Updated' })}</option>
          </select>
          {isAdmin && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('newMacro', { defaultValue: 'New Macro' })}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('newMacro', { defaultValue: 'New Macro' })}</DialogTitle>
          </DialogHeader>
          <MacroForm onSubmit={handleCreateMacro} isLoading={isEditing} />
        </DialogContent>
      </Dialog>

      {macros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('noMacros')}</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.domainId
              ? t('noMacrosDescription')
              : t('noMacrosEmpty')}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {macros.map((macro) => (
              <MacroCard
                key={macro.id}
                macro={macro}
                domain={domains.find(d => d.id === macro.domainId)}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="flex items-center justify-center py-4">
            {loadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t('loadingMore') || 'Loading more...'}</span>
              </div>
            )}
            {!hasMore && macros.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('allLoaded') || `All ${total} macros loaded`}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
