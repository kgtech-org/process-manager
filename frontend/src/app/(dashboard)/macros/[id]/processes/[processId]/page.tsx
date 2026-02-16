'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { MacroResource, Macro } from '@/lib/resources/macro';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Download, Edit } from 'lucide-react';
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
import { DiagramEditor } from '@/components/documents/DiagramEditor';

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('macros');
  const macroId = params.id as string;
  const processId = params.processId as string;

  const [macro, setMacro] = useState<Macro | null>(null);
  const [process, setProcess] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<ApplicationTask | null>(null);

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
          setProcess(processResponse.data);
        } else {
          setError('Process not found');
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

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();

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

    const updatedTasks = process.tasks.map(t =>
      t.code === editingTask.code ? { ...t, ...data } : t
    );

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
            {isAdmin && (
              <div className="flex items-center gap-2 ml-4 bg-gray-50 p-2 rounded-lg border">
                <span className="text-sm font-medium text-gray-600">Active</span>
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
              </div>
            )}
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
          <Button variant="outline" onClick={() => window.open(process.pdfUrl, '_blank')} disabled={!process.pdfUrl}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="tasks" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="annexes">Annexes</TabsTrigger>
              <TabsTrigger value="diagram">Process Map</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Process Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {process.tasks?.filter(t => isAdmin || t.isActive).sort((a, b) => a.order - b.order).map((task) => (
                      <div key={task.code} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="font-mono">{task.code}</Badge>
                            {isAdmin && (
                              <Badge variant={task.isActive ? "default" : "destructive"} className="text-[10px] h-5">
                                {task.isActive ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{task.description}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-3 ml-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={task.isActive}
                                onCheckedChange={(checked) => handleToggleTaskActive(task.code, checked)}
                                className="scale-75"
                              />
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTask(task)}>
                              <Edit className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {(!process.tasks || process.tasks.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No tasks defined for this process.
                      </div>
                    )}
                  </div>
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

            <TabsContent value="diagram" className="h-[600px] border rounded-lg bg-white overflow-hidden">
              <DiagramEditor
                readOnly={!isAdmin}
                initialShapes={
                  process.annexes?.find(a => a.type === 'diagram' && a.title === 'Process Map')?.content?.shapes || []
                }
                onChange={async (shapes) => {
                  const mapAnnex = process.annexes?.find(a => a.type === 'diagram' && a.title === 'Process Map');
                  if (mapAnnex) {
                    await handleUpdateAnnex(mapAnnex.id, { content: { shapes } });
                  } else {
                    await handleCreateAnnex({
                      title: 'Process Map',
                      type: 'diagram',
                      content: { shapes }
                    });
                  }
                }}
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
        </div>
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm initialData={editingTask} onSubmit={handleUpdateTask} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
