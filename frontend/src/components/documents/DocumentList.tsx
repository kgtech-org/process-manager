'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentCard } from './DocumentCard';
import { DocumentSearch } from './DocumentSearch';
import { DocumentResource, type Document, type DocumentFilter } from '@/lib/resources';
import { Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

interface DocumentListProps {
  initialFilters?: DocumentFilter;
}

export function DocumentList({ initialFilters = {} }: DocumentListProps) {
  const { toast } = useToast();
  const { t } = useTranslation('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<DocumentFilter>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const limit = 12;

  // Load initial documents or when filters change
  useEffect(() => {
    loadDocuments(true);
  }, [filters]);

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
          loadMoreDocuments();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [observerTarget.current]); // Only recreate when target element changes

  const loadDocuments = async (reset = false) => {
    try {
      setLoading(true);
      const response = await DocumentResource.getPaginated({
        ...filters,
        page: 1,
        limit,
      });
      setDocuments(response.data);
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
  };

  const loadMoreDocuments = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const response = await DocumentResource.getPaginated({
        ...filters,
        page: nextPage,
        limit,
      });

      setDocuments((prev) => [...prev, ...response.data]);
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

  const handleSearch = useCallback((newFilters: DocumentFilter) => {
    // Only update if filters actually changed (deep comparison)
    setFilters((prevFilters) => {
      const hasChanged =
        prevFilters.search !== newFilters.search ||
        prevFilters.status !== newFilters.status;

      if (!hasChanged) {
        return prevFilters; // Return same reference if values unchanged
      }

      // Reset pagination when filters change
      setCurrentPage(1);
      setHasMore(true);
      return newFilters;
    });
  }, []);

  const handleDuplicate = async (id: string) => {
    try {
      await DocumentResource.duplicate(id);
      toast({
        title: t('messages.duplicateSuccess'),
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.duplicateFailed'),
        description: error.message || t('messages.error'),
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('messages.deleteConfirm'))) return;

    try {
      await DocumentResource.delete(id);
      toast({
        title: t('messages.deleteSuccess'),
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.deleteFailed'),
        description: error.message || t('messages.error'),
      });
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentSearch onSearch={handleSearch} initialFilters={filters} />

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('noDocuments')}</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.status
              ? t('noDocumentsDescription')
              : t('noDocumentsEmpty')}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
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
            {!hasMore && documents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('allLoaded') || `All ${total} documents loaded`}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
