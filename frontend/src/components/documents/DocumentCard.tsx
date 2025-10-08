'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { useTranslation } from '@/lib/i18n';
import type { Document } from '@/lib/resources';
import { Calendar, User, FileText, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface DocumentCardProps {
  document: Document;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DocumentCard({ document, onDuplicate, onDelete }: DocumentCardProps) {
  const { t } = useTranslation('documents');
  const formattedDate = new Date(document.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const totalContributors =
    document.contributors.authors.length +
    document.contributors.verifiers.length +
    document.contributors.validators.length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">
              <Link href={`/documents/${document.id}`} className="hover:underline">
                {document.title}
              </Link>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {document.reference} • v{document.version}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DocumentStatusBadge status={document.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/documents/${document.id}`}>{t('viewDetails')}</Link>
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(document.id)}>
                    {t('duplicate')}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(document.id)}
                    className="text-destructive"
                  >
                    {t('delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{totalContributors} {totalContributors !== 1 ? t('contributors') : t('contributor')}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{document.processGroups.length} {document.processGroups.length !== 1 ? t('groups') : t('group')}</span>
          </div>
        </div>
        {document.metadata?.objectives && document.metadata.objectives.length > 0 && (
          <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {document.metadata.objectives[0]}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
