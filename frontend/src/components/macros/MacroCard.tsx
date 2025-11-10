'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { Macro } from '@/types/macro';
import { Calendar, FileText, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface MacroCardProps {
  macro: Macro;
  onDelete?: (id: string) => void;
}

export function MacroCard({ macro, onDelete }: MacroCardProps) {
  const { t } = useTranslation('macros');
  const formattedDate = new Date(macro.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="font-mono text-xs">
                {macro.code}
              </Badge>
              <CardTitle className="text-lg">
                <Link href={`/macros/${macro.id}`} className="hover:underline">
                  {macro.name}
                </Link>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground line-clamp-2">
              {macro.shortDescription}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/macros/${macro.id}`}>{t('viewDetails')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/macros/${macro.id}/edit`}>{t('edit')}</Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(macro.id)}
                  className="text-destructive"
                >
                  {t('delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>
              {macro.processCount || 0} {macro.processCount !== 1 ? t('processes') : t('process')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
