'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import type { DocumentStatus } from '@/lib/resources';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<DocumentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  draft: {
    variant: 'secondary'
  },
  author_review: {
    variant: 'warning'
  },
  author_signed: {
    variant: 'outline'
  },
  verifier_review: {
    variant: 'warning'
  },
  verifier_signed: {
    variant: 'outline'
  },
  validator_review: {
    variant: 'warning'
  },
  approved: {
    variant: 'success'
  },
  archived: {
    variant: 'destructive'
  }
};

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  const { t } = useTranslation('documents');
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {t(`status.${status}`)}
    </Badge>
  );
}
