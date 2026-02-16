'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MacroCard } from './MacroCard';
import { MacroSearch } from './MacroSearch';
import { MacroResource, type MacroFilter } from '@/lib/resources/macro';
import type { Macro } from '@/types/macro';
import { Loader2, Layers } from 'lucide-react';
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
    // Only update if filters actually changed
    setFilters((prevFilters) => {
      const hasChanged = prevFilters.search !== newFilters.search;

      if (!hasChanged) {
        return prevFilters; // Return same reference if values unchanged
      }

      // Reset pagination when filters change
      setCurrentPage(1);
      setHasMore(true);
      return newFilters;
    });
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
      <div className="flex justify-between items-center">
        <MacroSearch onSearch={handleSearch} initialFilters={filters} />
        {isAdmin && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newMacro', { defaultValue: 'New Macro' })}
          </Button>
        )}
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
            {filters.search
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
