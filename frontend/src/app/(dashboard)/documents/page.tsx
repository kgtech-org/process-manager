'use client';

import { DocumentList } from '@/components/documents/DocumentList';
import { PendingInvitationsWidget } from '@/components/invitations/PendingInvitationsWidget';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function DocumentsPage() {
  const { t } = useTranslation('documents');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button asChild>
          <Link href="/documents/new">
            <Plus className="h-4 w-4 mr-2" />
            {t('newDocument')}
          </Link>
        </Button>
      </div>

      {/* Pending Invitations */}
      <PendingInvitationsWidget />

      <DocumentList />
    </div>
  );
}
