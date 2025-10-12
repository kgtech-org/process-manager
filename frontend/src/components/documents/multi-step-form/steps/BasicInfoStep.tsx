'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BasicInfoStepProps {
  data: {
    reference: string;
    title: string;
    version: string;
  };
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const { t } = useTranslation('documents');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('form.steps.basicInfo.title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('form.steps.basicInfo.description')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reference">
            {t('form.reference')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reference"
            placeholder={t('form.referencePlaceholder') || 'TG-TELCO-PRO-XXX'}
            value={data.reference}
            onChange={(e) => onChange('reference', e.target.value)}
            className={errors.reference ? 'border-destructive' : ''}
          />
          {errors.reference && (
            <p className="text-sm text-destructive">{errors.reference}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('form.referenceHint') || 'Format: TG-TELCO-PRO-XXX (e.g., TG-TELCO-PRO-101)'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">
            {t('form.title')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder={t('form.titlePlaceholder') || 'Enter document title'}
            value={data.title}
            onChange={(e) => onChange('title', e.target.value)}
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('form.titleHint') || 'Provide a clear, descriptive title for the process'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">
            {t('form.version')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="version"
            placeholder="1.0"
            value={data.version}
            onChange={(e) => onChange('version', e.target.value)}
            className={errors.version ? 'border-destructive' : ''}
          />
          {errors.version && (
            <p className="text-sm text-destructive">{errors.version}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('form.versionHint') || 'Format: X.Y (e.g., 1.0, 2.1)'}
          </p>
        </div>
      </div>
    </div>
  );
};
