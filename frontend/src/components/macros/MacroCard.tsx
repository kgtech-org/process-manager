'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { Macro } from '@/types/macro';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, FileText, MoreVertical, Edit, Trash2 } from 'lucide-react';

interface MacroCardProps {
  macro: Macro;
  domain?: { code: string; name: string };
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  isAdmin?: boolean;
}

export function MacroCard({ macro, domain, onDelete, onToggleActive, isAdmin }: MacroCardProps) {
  const { t } = useTranslation('macros');
  const formattedDate = new Date(macro.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate progress or status color based on active state
  const statusColor = macro.isActive ? 'bg-green-500' : 'bg-gray-300';
  const statusText = macro.isActive ? 'Active' : 'Inactive';

  return (
    <Card className="group relative overflow-hidden border border-gray-100 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:border-blue-100/50 hover:bg-white/80 dark:bg-gray-900/50 dark:hover:bg-gray-900/80">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

      <CardHeader className="relative pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-white/50 backdrop-blur-md px-2 py-0.5 text-xs font-mono font-medium text-blue-600 border-blue-100 shadow-sm"
              >
                {macro.code}
              </Badge>
              {domain && (
                <Badge
                  variant="outline"
                  className="bg-indigo-50/50 backdrop-blur-md px-2 py-0.5 text-xs font-mono font-medium text-indigo-600 border-indigo-100 shadow-sm"
                  title={domain.name}
                >
                  {domain.code}
                </Badge>
              )}
              {isAdmin && (
                <div className={`h-2 w-2 rounded-full ${statusColor}`} title={statusText} />
              )}
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-blue-700 transition-colors">
              <Link href={`/macros/${macro.id}`} className="hover:underline decoration-blue-300 underline-offset-4">
                {macro.name}
              </Link>
            </CardTitle>
          </div>

          <div className="flex items-center gap-1 z-10">
            {isAdmin && onToggleActive && (
              <Switch
                id={`macro-active-${macro.id}`}
                checked={macro.isActive}
                onCheckedChange={(checked) => onToggleActive(macro.id, checked)}
                className="data-[state=checked]:bg-blue-600 mr-2 scale-90"
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100/50">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/macros/${macro.id}`} className="cursor-pointer flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-blue-500" />
                    {t('viewDetails')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/macros/${macro.id}/edit`} className="cursor-pointer flex items-center">
                    <Edit className="mr-2 h-4 w-4 text-orange-500" />
                    {t('edit')}
                  </Link>
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(macro.id)}
                      className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                    >
                      <div className="flex items-center w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('delete')}
                      </div>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-sm text-gray-500 mt-2 min-h-[2.5rem]">
          {macro.shortDescription || t('noDescription')}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative pt-2">
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-1.5" title="Created date">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Number of processes">
              <div className="flex items-center justify-center h-4 w-4 rounded-full bg-blue-50 text-blue-600">
                <span className="text-[10px] font-bold">{macro.processCount || 0}</span>
              </div>
              <span>{macro.processCount !== 1 ? t('processes') : t('process')}</span>
            </div>
          </div>

          <Button variant="ghost" size="sm" asChild className="text-xs h-7 hover:bg-blue-50 hover:text-blue-700 -mr-2">
            <Link href={`/macros/${macro.id}`}>
              Open
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
