'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { DocumentResource } from '@/lib/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewDocumentPage() {
  const { t } = useTranslation('documents');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reference: '',
    title: '',
    version: '1.0',
  });
  const [errors, setErrors] = useState({
    reference: '',
    title: '',
    version: '',
  });

  const validateForm = () => {
    const newErrors = {
      reference: '',
      title: '',
      version: '',
    };
    let isValid = true;

    if (!formData.reference.trim()) {
      newErrors.reference = t('form.errors.referenceRequired');
      isValid = false;
    }

    if (!formData.title.trim()) {
      newErrors.title = t('form.errors.titleRequired');
      isValid = false;
    }

    if (!formData.version.trim()) {
      newErrors.version = t('form.errors.versionRequired');
      isValid = false;
    } else if (!/^\d+\.\d+$/.test(formData.version)) {
      newErrors.version = t('form.errors.versionFormat');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const document = await DocumentResource.create({
        reference: formData.reference,
        title: formData.title,
        version: formData.version,
        contributors: {
          authors: [],
          verifiers: [],
          validators: [],
        },
        metadata: {
          objectives: [],
          implicatedActors: [],
          managementRules: [],
          terminology: [],
          changeHistory: [],
        },
        processGroups: [],
      });

      toast({
        title: t('messages.createSuccess'),
      });

      router.push(`/documents/${document.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.createFailed'),
        description: error.message || t('messages.error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('form.createTitle')}</h1>
          <p className="text-muted-foreground">{t('form.createSubtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('form.basicInfo')}</CardTitle>
          <CardDescription>{t('form.basicInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">
                {t('form.reference')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reference"
                placeholder={t('form.referencePlaceholder')}
                value={formData.reference}
                onChange={(e) => handleChange('reference', e.target.value)}
                className={errors.reference ? 'border-destructive' : ''}
                disabled={loading}
              />
              {errors.reference && (
                <p className="text-sm text-destructive">{errors.reference}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('form.referenceHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                {t('form.title')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t('form.titlePlaceholder')}
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={errors.title ? 'border-destructive' : ''}
                disabled={loading}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">
                {t('form.version')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="version"
                placeholder="1.0"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                className={errors.version ? 'border-destructive' : ''}
                disabled={loading}
              />
              {errors.version && (
                <p className="text-sm text-destructive">{errors.version}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('form.versionHint')}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('form.create')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/documents')}
                disabled={loading}
              >
                {tCommon('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
