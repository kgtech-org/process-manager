import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/lib/resources';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const statusConfig: Record<DocumentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  draft: {
    label: 'Draft',
    variant: 'secondary'
  },
  author_review: {
    label: 'Author Review',
    variant: 'warning'
  },
  author_signed: {
    label: 'Author Signed',
    variant: 'outline'
  },
  verifier_review: {
    label: 'Verifier Review',
    variant: 'warning'
  },
  verifier_signed: {
    label: 'Verifier Signed',
    variant: 'outline'
  },
  validator_review: {
    label: 'Validator Review',
    variant: 'warning'
  },
  approved: {
    label: 'Approved',
    variant: 'success'
  },
  archived: {
    label: 'Archived',
    variant: 'destructive'
  }
};

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
