'use client';

import { useState, useEffect } from 'react';
import { DocumentCard } from './DocumentCard';
import { DocumentSearch } from './DocumentSearch';
import { Button } from '@/components/ui/button';
import { DocumentResource, type Document, type DocumentFilter } from '@/lib/resources';
import { ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentListProps {
  initialFilters?: DocumentFilter;
}

export function DocumentList({ initialFilters = {} }: DocumentListProps) {
  const { toast } = useToast();
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
        title: 'Failed to load documents',
        description: error.message || 'An error occurred while loading documents',
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
        title: 'Document duplicated successfully',
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to duplicate document',
        description: error.message || 'An error occurred',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await DocumentResource.delete(id);
      toast({
        title: 'Document deleted successfully',
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete document',
        description: error.message || 'An error occurred',
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
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.status
              ? 'Try adjusting your search filters'
              : 'Create your first document to get started'}
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
                Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} documents
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
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
