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

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Plus, FileText, Edit, Download, GripVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { DocumentResource } from '@/lib/resources/document';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProcessForm } from '@/components/macros/ProcessForm';

// SortableProcessItem Component
interface SortableProcessItemProps {
  process: Process;
  macroId: string;
  isAdmin: boolean;
  onToggleActive: (processId: string, checked: boolean) => Promise<void>;
  t: (key: string, options?: any) => string;
}

function SortableProcessItem({ process, macroId, isAdmin, onToggleActive, t }: SortableProcessItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: process.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 mb-3 ${isDragging ? 'shadow-lg' : ''}`}>
      {isAdmin && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-2 flex-shrink-0"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1">
        <Link
          key={process.id}
          href={`/macros/${macroId}/processes/${process.id}`}
          className="block"
        >
          <div className={`border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors ${isDragging ? 'bg-blue-50 border-blue-200' : ''}`}>
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
              <div className="ml-4 flex items-center gap-2">
                {process.pdfUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(process.pdfUrl, '_blank');
                    }}
                    title={t('exportPdf', { defaultValue: 'Export PDF' })}
                  >
                    <Download className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
                {isAdmin && (
                  <div className="flex items-center space-x-2" onClick={(e) => e.preventDefault()}>
                    <Switch
                      checked={process.isActive}
                      onCheckedChange={(checked) => onToggleActive(process.id, checked)}
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
      </div>
    </div>
  );
}

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
  const [isCreateProcessModalOpen, setIsCreateProcessModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        // Ensure processes are sorted by order
        if (data) {
          data.sort((a: Process, b: Process) => (a.order || 0) - (b.order || 0));
        }
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
  }, [macroId, t, isAdmin]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = processes.findIndex((p) => p.id === active.id);
    const newIndex = processes.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new array with updated order
    const newProcesses = arrayMove(processes, oldIndex, newIndex).map((p, index) => ({
      ...p,
      order: index + 1
    }));

    // Optimistically update state
    setProcesses(newProcesses);

    try {
      const processIds = newProcesses.map(p => p.id);
      await MacroResource.reorderProcesses(macroId, processIds);
      toast({
        title: t('messages.orderUpdated', { defaultValue: 'Process order updated' }),
      });
    } catch (error: any) {
      console.error('Failed to update process order:', error);
      // Revert state
      // Reload processes to be safe
      const response = await MacroResource.getProcesses(macroId, 1, 100);
      const data = response.data;
      if (data) {
        data.sort((a: Process, b: Process) => (a.order || 0) - (b.order || 0));
      }
      setProcesses(isAdmin ? data : data.filter(p => p.isActive));

      toast({
        variant: 'destructive',
        title: t('messages.updateFailed', { defaultValue: 'Failed to update process order' }),
        description: error.message,
      });
    }
  };

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

  const handleCreateProcess = async (data: any) => {
    if (!macro) return;
    try {
      // Determine next order
      const nextOrder = processes.length + 1;

      const payload = {
        macroId: macroId,
        title: data.title,
        processCode: data.processCode || undefined,
        description: data.description || '',
        shortDescription: data.shortDescription || '',
        isActive: data.isActive,
        // Required by backend: at least one task
        tasks: [{
          code: data.processCode ? `${data.processCode}_T1` : 'T1',
          description: 'Initial Task',
          order: 1,
          isActive: true
        }]
        // Backend handles order assignment automatically now, but we can pass it if we wanted to be explicit
        // The service logic I wrote: order = count + 1 if attached to macro
      };

      await DocumentResource.create(payload as any); // Type assertion if needed locally
      toast({
        title: t('messages.createSuccess', { defaultValue: 'Process created successfully' }),
      });
      setIsCreateProcessModalOpen(false);
      // Refresh processes
      const response = await MacroResource.getProcesses(macroId, 1, 100);
      const newData = response.data;
      if (newData) {
        newData.sort((a: Process, b: Process) => (a.order || 0) - (b.order || 0));
      }
      setProcesses(isAdmin ? newData : newData.filter(p => p.isActive));
    } catch (error: any) {
      console.error('Failed to create process:', error);
      toast({
        variant: 'destructive',
        title: t('messages.createFailed', { defaultValue: 'Failed to create process' }),
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
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/macros/${macroId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            {t('edit', { defaultValue: 'Edit' })}
          </Button>
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
            <Button size="sm" onClick={() => setIsCreateProcessModalOpen(true)}>
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
              <Button size="sm" onClick={() => setIsCreateProcessModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstProcess', { defaultValue: 'Add First Process' })}
              </Button>
            </div>
          ) : (
            <div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={processes.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {processes.map((process) => (
                      <SortableProcessItem
                        key={process.id}
                        process={process}
                        macroId={macroId}
                        isAdmin={isAdmin || false}
                        onToggleActive={handleToggleProcessActive}
                        t={t}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateProcessModalOpen} onOpenChange={setIsCreateProcessModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('addNewProcess', { defaultValue: 'Add New Process' })}</DialogTitle>
          </DialogHeader>
          <ProcessForm onSubmit={handleCreateProcess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
