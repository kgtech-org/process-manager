'use client';

import { MacroList } from '@/components/macros/MacroList';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function MacrosPage() {
  const { t } = useTranslation('macros');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <MacroList />
    </div>
  );
}
