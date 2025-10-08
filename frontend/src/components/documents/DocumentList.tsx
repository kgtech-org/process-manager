'use client';

import { useState, useEffect } from 'react';
import { DocumentCard } from './DocumentCard';
import { DocumentSearch } from './DocumentSearch';
import { Button } from '@/components/ui/button';
import { DocumentResource, type Document, type DocumentFilter } from '@/lib/resources';
import { ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

interface DocumentListProps {
  initialFilters?: DocumentFilter;
}

export function DocumentList({ initialFilters = {} }: DocumentListProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DocumentFilter>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 12;

  useEffect(() => {
    loadDocuments();
  }, [filters, currentPage]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await DocumentResource.getPaginated({
        ...filters,
        page: currentPage,
        limit,
      });
      setDocuments(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('documents.messages.loadFailed'),
        description: error.message || t('documents.messages.loadError'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newFilters: DocumentFilter) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await DocumentResource.duplicate(id);
      toast({
        title: t('documents.messages.duplicateSuccess'),
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('documents.messages.duplicateFailed'),
        description: error.message || t('documents.messages.error'),
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('documents.messages.deleteConfirm'))) return;

    try {
      await DocumentResource.delete(id);
      toast({
        title: t('documents.messages.deleteSuccess'),
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('documents.messages.deleteFailed'),
        description: error.message || t('documents.messages.error'),
      });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
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
          <h3 className="text-lg font-semibold mb-2">{t('documents.noDocuments')}</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.status
              ? t('documents.noDocumentsDescription')
              : t('documents.noDocumentsEmpty')}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {t('documents.showing')} {(currentPage - 1) * limit + 1} {t('documents.to')} {Math.min(currentPage * limit, total)} {t('documents.of')} {total} {t('documents.documents')}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t('documents.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loading}
                >
                  {t('documents.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
