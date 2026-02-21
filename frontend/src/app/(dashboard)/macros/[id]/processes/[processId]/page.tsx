'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { MacroResource, Macro } from '@/lib/resources/macro';
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
import { ArrowLeft, FileText, Edit, Plus, GripVertical } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { DocumentResource, Document, ApplicationTask } from '@/lib/resources/document';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskForm } from "@/components/macros/TaskForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnexEditor } from '@/components/documents/AnnexEditor';
import { JobPosition, JobPositionResource } from '@/lib/resources/jobPosition';

// Sortable Task Item Component
interface SortableTaskItemProps {
  task: ApplicationTask;
  isAdmin: boolean;
  onToggleActive: (code: string, checked: boolean) => void;
  onEdit: (task: ApplicationTask) => void;
  jobPositionMap: Record<string, string>;
}

function SortableTaskItem({ task, isAdmin, onToggleActive, onEdit, jobPositionMap }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.code });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isDragging ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}
    >
      <div className="flex-1 flex gap-3">
        {isAdmin && (
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className="font-mono">{task.code}</Badge>
            {isAdmin && (
              <Badge variant={task.isActive ? "default" : "destructive"} className="text-[10px] h-5">
                {task.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
            {task.intervenants && task.intervenants.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {task.intervenants.map(id => (
                  <Badge key={id} variant="outline" className="text-[10px] h-5 border-blue-200 text-blue-700 bg-blue-50">
                    {jobPositionMap[id] || 'Unknown'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1">{task.description}</p>
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={task.isActive}
              onCheckedChange={(checked) => onToggleActive(task.code, checked)}
              className="scale-75"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('macros');
  const macroId = params.id as string;
  const processId = params.processId as string;

  const [macro, setMacro] = useState<Macro | null>(null);
  const [process, setProcess] = useState<Document | null>(null);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<ApplicationTask | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [macroData, processResponse] = await Promise.all([
          MacroResource.getById(macroId),
          apiClient.get(`/documents/${processId}`)
        ]);

        setMacro(macroData);

        if (processResponse.success && processResponse.data) {
          // Ensure tasks are sorted by order
          const processData = processResponse.data;
          if (processData.tasks) {
            processData.tasks.sort((a: ApplicationTask, b: ApplicationTask) => a.order - b.order);
          }
          setProcess(processData);
        } else {
          setError('Process not found');
        }

        // Load job positions for resolving IDs
        try {
          const jpData = await JobPositionResource.getAll();
          setJobPositions(jpData);
        } catch (e) {
          console.error("Failed to load job positions", e);
        }
      } catch (err) {
        console.error('Failed to load process:', err);
        setError('Failed to load process details');
      } finally {
        setLoading(false);
      }
    };

    if (macroId && processId) {
      loadData();
    }
  }, [macroId, processId]);

  const jobPositionMap = useMemo(() => {
    const map: Record<string, string> = {};
    jobPositions.forEach(jp => {
      map[jp.id] = jp.code;
    });
    return map;
  }, [jobPositions]);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !process?.tasks) return;

    const oldIndex = process.tasks.findIndex((t) => t.code === active.id);
    const newIndex = process.tasks.findIndex((t) => t.code === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new array with updated order
    const newTasks = arrayMove(process.tasks, oldIndex, newIndex).map((t, index) => ({
      ...t,
      order: index + 1
    }));

    // Optimistically update state
    setProcess({ ...process, tasks: newTasks } as any);

    try {
      await DocumentResource.update(processId, { tasks: newTasks });
      toast({
        title: t('messages.orderUpdated', { defaultValue: 'Task order updated' }),
      });
    } catch (error: any) {
      console.error('Failed to update task order:', error);
      // Revert state (re-fetch would be safer but this is a simple revert)
      const revertedTasks = arrayMove(newTasks, newIndex, oldIndex).map((t, index) => ({
        ...t,
        order: index + 1 // technically this logic assumes simple swap, re-fetching is better
      }));
      // Better to just reload
      const updatedDoc = await apiClient.get(`/documents/${processId}`);
      if (updatedDoc.success) {
        if (updatedDoc.data.tasks) {
          updatedDoc.data.tasks.sort((a: ApplicationTask, b: ApplicationTask) => a.order - b.order);
        }
        setProcess(updatedDoc.data);
      }

      toast({
        variant: 'destructive',
        title: t('messages.updateFailed', { defaultValue: 'Failed to update task order' }),
        description: error.message,
      });
    }
  };

  const handleToggleTaskActive = async (taskCode: string, checked: boolean) => {
    if (!process || !process.tasks) return;

    const updatedTasks = process.tasks.map(t =>
      t.code === taskCode ? { ...t, isActive: checked } : t
    );

    try {
      await DocumentResource.update(processId, { tasks: updatedTasks });
      setProcess({ ...process, tasks: updatedTasks } as any);
      toast({
        title: t('messages.updateSuccess', { defaultValue: 'Task updated successfully' }),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.updateFailed', { defaultValue: 'Update failed' }),
        description: error.message,
      });
    }
  };

  const handleUpdateTask = async (data: any) => {
    if (!process || !process.tasks || !editingTask) return;

    // Ensure code is fully qualified if it's relative
    let taskCode = data.code;
    if (taskCode && !taskCode.startsWith(process.processCode + '_') && !taskCode.startsWith('M')) {
      taskCode = `${process.processCode}_${taskCode}`;
    }

    const updatedTasks = process.tasks.map(t =>
      t.code === editingTask.code ? { ...t, ...data, code: taskCode } : t
    );

    // Sort tasks to maintain order
    updatedTasks.sort((a, b) => a.order - b.order);

    try {
      await DocumentResource.update(processId, { tasks: updatedTasks });
      setProcess({ ...process, tasks: updatedTasks } as any);
      setEditingTask(null);
      toast({
        title: t('messages.updateSuccess', { defaultValue: 'Task updated successfully' }),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.updateFailed', { defaultValue: 'Update failed' }),
        description: error.message,
      });
    }
  };

  const handleCreateTask = async (data: any) => {
    if (!process) return;

    // Ensure code is fully qualified
    let taskCode = data.code;
    if (taskCode && !taskCode.startsWith(process.processCode + '_') && !taskCode.startsWith('M')) {
      taskCode = `${process.processCode}_${taskCode}`;
    }

    const newTask = {
      ...data,
      code: taskCode
    };

    const currentTasks = process.tasks || [];
    const updatedTasks = [...currentTasks, newTask];

    // Ensure sorting
    updatedTasks.sort((a, b) => a.order - b.order);

    try {
      await DocumentResource.update(processId, { tasks: updatedTasks });
      setProcess({ ...process, tasks: updatedTasks } as any);
      setIsCreateTaskModalOpen(false);
      toast({
        title: t('messages.createSuccess', { defaultValue: 'Task created successfully' }),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.createFailed', { defaultValue: 'Failed to create task' }),
        description: error.message,
      });
    }
  };

  const [activeTab, setActiveTab] = useState('tasks');

  const handleCreateAnnex = async (annex: { title: string; type: any; content: any }) => {
    if (!process) return;
    try {
      await DocumentResource.createAnnex(processId, annex);
      const updatedDoc = await apiClient.get(`/documents/${processId}`);
      if (updatedDoc.success) setProcess(updatedDoc.data);
      toast({ title: t('messages.createSuccess', { defaultValue: 'Annex created' }) });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to create annex', description: error.message });
    }
  };

  const handleUpdateAnnex = async (annexId: string, updates: any) => {
    if (!process) return;
    try {
      await DocumentResource.updateAnnex(processId, annexId, updates);
      // Optimistically update or refetch
      const updatedDoc = await apiClient.get(`/documents/${processId}`);
      if (updatedDoc.success) setProcess(updatedDoc.data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to update annex', description: error.message });
    }
  };

  const handleDeleteAnnex = async (annexId: string) => {
    if (!process) return;
    try {
      await DocumentResource.deleteAnnex(processId, annexId);
      const updatedDoc = await apiClient.get(`/documents/${processId}`);
      if (updatedDoc.success) setProcess(updatedDoc.data);
      toast({ title: t('messages.deleteSuccess', { defaultValue: 'Annex deleted' }) });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to delete annex', description: error.message });
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

  if (error || !process || !macro) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error || 'Process not found'}</p>
          <Button
            onClick={() => router.push(`/macros/${macroId}`)}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Macro
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Macros', href: '/macros' },
    { label: `${macro.code} - ${macro.name}`, href: `/macros/${macroId}` },
    { label: `${process.processCode || 'P'} - ${process.title}` },
  ];

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800',
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: t('macros'), href: '/macros' },
          { label: macro.name, href: `/macros/${macroId}` },
          { label: process.title, href: '#' },
        ]}
      />

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{process.title}</h1>
            <Badge variant="outline" className="text-lg py-1">{process.processCode}</Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-lg">{process.description}</p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => router.push(`/macros/${macroId}/processes/${processId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Process
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="tasks" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="annexes">Annexes</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Process Tasks</CardTitle>
                    {isAdmin && (
                      <Button size="sm" onClick={() => setIsCreateTaskModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('addTask', { defaultValue: 'Add Task' })}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {process.tasks && process.tasks.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={process.tasks.map(t => t.code)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {process.tasks.map((task) => (
                            <SortableTaskItem
                              key={task.code}
                              task={task}
                              isAdmin={isAdmin || false}
                              onToggleActive={handleToggleTaskActive}
                              onEdit={setEditingTask}
                              jobPositionMap={jobPositionMap}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No tasks defined for this process.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="annexes">
              <AnnexEditor
                documentId={processId}
                annexes={process.annexes || []}
                onCreateAnnex={handleCreateAnnex}
                onUpdateAnnex={handleUpdateAnnex}
                onDeleteAnnex={handleDeleteAnnex}
                readOnly={!isAdmin}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={process.isActive ? "default" : "secondary"}>
                      {process.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {isAdmin && (
                      <Switch
                        checked={process.isActive}
                        onCheckedChange={async (checked) => {
                          try {
                            await DocumentResource.update(processId, { isActive: checked });
                            setProcess({ ...process, isActive: checked } as any);
                            toast({ title: "Status updated" });
                          } catch (e) {
                            toast({ variant: "destructive", title: "Failed to update status" });
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Version</p>
                <p className="font-medium">{process.version}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Reference</p>
                <p className="font-medium font-mono text-sm">{process.reference}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Created</p>
                <p className="font-medium">
                  {new Date(process.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="font-medium">
                  {new Date(process.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {process.contributors.authors.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Authors</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {process.contributors.authors.map((author, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{author.name}</span>
                    <Badge variant="outline">{author.title}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {process.metadata.objectives.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Objectives</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {process.metadata.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Add sidebar card for Summary of Intervenants involved in this process */}
          {Object.keys(jobPositionMap).length > 0 && process.tasks && (
            <Card>
              <CardHeader><CardTitle>Involved Roles</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(process.tasks.flatMap(t => t.intervenants || []))).map(id => (
                    <Badge key={id} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                      {jobPositionMap[id] || 'Unknown'}
                    </Badge>
                  ))}
                  {(!process.tasks.some(t => t.intervenants && t.intervenants.length > 0)) && (
                    <span className="text-sm text-gray-500">No specific roles assigned.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editTask', { defaultValue: 'Edit Task' })}</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm initialData={editingTask} onSubmit={handleUpdateTask} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateTaskModalOpen} onOpenChange={setIsCreateTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addNewTask', { defaultValue: 'Add New Task' })}</DialogTitle>
          </DialogHeader>
          <TaskForm
            initialData={{
              code: `T${(process.tasks?.length || 0) + 1}`,
              description: '',
              order: (process.tasks?.length || 0) + 1,
              isActive: true,
              intervenants: []
            } as any}
            onSubmit={handleCreateTask}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
