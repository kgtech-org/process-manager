'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { MacroResource, Macro, Process } from '@/lib/resources/macro';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ArrowLeft, Plus, FileText, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { DocumentResource } from '@/lib/resources/document';

export default function MacroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('macros');
  const macroId = params.id as string;

  const [macro, setMacro] = useState<Macro | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [processesLoading, setProcessesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const loadMacro = async () => {
      try {
        setLoading(true);
        const macroData = await MacroResource.getById(macroId);
        setMacro(macroData);
      } catch (err) {
        console.error('Failed to load macro:', err);
        setError(t('errorLoadingMacro', { defaultValue: 'Failed to load macro' }));
      } finally {
        setLoading(false);
      }
    };

    const loadProcesses = async () => {
      try {
        setProcessesLoading(true);
        const response = await MacroResource.getProcesses(macroId, 1, 100);
        const data = response.data;
        // Filter out inactive processes for non-admin users
        setProcesses(isAdmin ? data : data.filter(p => p.isActive));
      } catch (err) {
        console.error('Failed to load processes:', err);
      } finally {
        setProcessesLoading(false);
      }
    };



    if (macroId) {
      loadMacro();
      loadProcesses();
    }
  }, [macroId, t]);

  const handleToggleMacroActive = async (checked: boolean) => {
    if (!macro) return;
    try {
      await MacroResource.update(macroId, { isActive: checked });
      setMacro({ ...macro, isActive: checked });
      toast({
        title: t('messages.updateSuccess') || 'Macro updated successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.updateFailed') || 'Update failed',
        description: error.message || t('messages.error'),
      });
    }
  };

  const handleToggleProcessActive = async (processId: string, checked: boolean) => {
    try {
      // Use DocumentResource to update process (document)
      await DocumentResource.update(processId, { isActive: checked });
      setProcesses(prev => prev.map(p => p.id === processId ? { ...p, isActive: checked } : p));
      toast({
        title: t('messages.updateSuccess') || 'Process updated successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.updateFailed') || 'Update failed',
        description: error.message || t('messages.error'),
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !macro) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">
            {t('error', { defaultValue: 'Error' })}
          </h2>
          <p className="text-red-600">
            {error || t('macroNotFound', { defaultValue: 'Macro not found' })}
          </p>
          <Button
            onClick={() => router.push('/macros')}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToMacros', { defaultValue: 'Back to Macros' })}
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: t('macros', { defaultValue: 'Macros' }), href: '/macros' },
    { label: `${macro.code} - ${macro.name}` },
  ];

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      {/* Back Button */}
      <Button
        onClick={() => router.push('/macros')}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('backToMacros', { defaultValue: 'Back to Macros' })}
      </Button>

      {/* Macro Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {macro.code}
              </Badge>
              <Badge
                variant={macro.isActive ? 'default' : 'secondary'}
                className="capitalize"
              >
                {macro.isActive
                  ? t('active', { defaultValue: 'Active' })
                  : t('inactive', { defaultValue: 'Inactive' })}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {macro.name}
            </h1>
            {macro.description && (
              <p className="text-gray-600 text-lg">{macro.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <div className="flex items-center space-x-2 mr-2">
                <span className="text-sm text-gray-500">{macro.isActive ? t('active') : t('inactive')}</span>
                <Switch
                  checked={macro.isActive}
                  onCheckedChange={handleToggleMacroActive}
                />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push(`/macros/${macroId}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              {t('edit', { defaultValue: 'Edit' })}
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('addProcess', { defaultValue: 'Add Process' })}
            </Button>
          </div>
        </div>
      </div>

      {/* Macro Information Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('macroInformation', { defaultValue: 'Macro Information' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {t('code', { defaultValue: 'Code' })}
              </p>
              <p className="font-medium">{macro.code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {t('processCount', { defaultValue: 'Processes' })}
              </p>
              <p className="font-medium">{processes.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {t('status', { defaultValue: 'Status' })}
              </p>
              <Badge variant={macro.isActive ? 'default' : 'secondary'}>
                {macro.isActive
                  ? t('active', { defaultValue: 'Active' })
                  : t('inactive', { defaultValue: 'Inactive' })}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {t('createdAt', { defaultValue: 'Created' })}
              </p>
              <p className="font-medium">
                {new Date(macro.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {t('processes', { defaultValue: 'Processes' })} ({processes.length})
            </CardTitle>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('addProcess', { defaultValue: 'Add Process' })}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {processesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : processes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {t('noProcesses', { defaultValue: 'No processes found for this macro' })}
              </p>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstProcess', { defaultValue: 'Add First Process' })}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {processes.map((process) => (
                <Link
                  key={process.id}
                  href={`/macros/${macroId}/processes/${process.id}`}
                  className="block"
                >
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline" className="font-mono">
                            {process.processCode}
                          </Badge>
                          <Badge
                            variant={process.isActive ? 'default' : 'secondary'}
                            className="capitalize text-xs"
                          >
                            {process.isActive
                              ? t('active', { defaultValue: 'Active' })
                              : t('inactive', { defaultValue: 'Inactive' })}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {process.title}
                        </h3>
                        {process.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {process.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        {isAdmin && (
                          <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
                            <Switch
                              checked={process.isActive}
                              onCheckedChange={(checked) => handleToggleProcessActive(process.id, checked)}
                            />
                          </div>
                        )}
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
