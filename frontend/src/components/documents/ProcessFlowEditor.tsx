'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InlineEditable } from '@/components/ui/inline-editable';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileOutput,
  User,
  ArrowRight,
  List,
  Plus,
  Trash2,
  GripVertical,
  X,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { ProcessGroup, ProcessStep } from '@/lib/resources/document';
import { useToast } from '@/hooks/use-toast';

interface ProcessFlowEditorProps {
  processGroups: ProcessGroup[];
  documentId: string;
  onUpdate: (processGroups: ProcessGroup[]) => Promise<void>;
  readOnly?: boolean;
}

// Sortable Group Wrapper
const SortableGroup = React.memo(function SortableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full">
      {children}
    </div>
  );
});

// Sortable Step Wrapper
const SortableStep = React.memo(function SortableStep({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full">
      {children}
    </div>
  );
});

export const ProcessFlowEditor: React.FC<ProcessFlowEditorProps> = ({
  processGroups: initialGroups,
  documentId,
  onUpdate,
  readOnly = false,
}) => {
  const { t } = useTranslation('documents');
  const [groups, setGroups] = useState<ProcessGroup[]>(initialGroups);
  const { toast } = useToast();
  const isInternalChangeRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync with prop changes (only when not from internal changes)
  useEffect(() => {
    if (!isInternalChangeRef.current) {
      setGroups(initialGroups);
    }
    isInternalChangeRef.current = false;
  }, [initialGroups]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Helper to get localStorage key
  const getStorageKey = (suffix: string) => `processFlow_${documentId}_${suffix}`;

  // Load expanded state from localStorage
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(getStorageKey('groups'));
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(getStorageKey('steps'));
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist expanded state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('groups'), JSON.stringify(Array.from(expandedGroups)));
  }, [expandedGroups, documentId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getStorageKey('steps'), JSON.stringify(Array.from(expandedSteps)));
  }, [expandedSteps, documentId]);

  // Persist and restore scroll position
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Restore scroll position on mount
    const savedScrollPosition = localStorage.getItem(getStorageKey('scroll'));
    if (savedScrollPosition) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
      }, 100);
    }

    // Save scroll position on scroll
    const handleScroll = () => {
      localStorage.setItem(getStorageKey('scroll'), window.scrollY.toString());
    };

    // Throttle scroll events to avoid performance issues
    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledScroll);

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [documentId]);

  // Drag and drop sensors with activation constraint
  // Only use PointerSensor to avoid KeyboardSensor capturing spacebar in input fields
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Auto-save helper - mark as internal change to prevent prop sync loop
  const autoSave = useCallback(async (updatedGroups: ProcessGroup[]) => {
    isInternalChangeRef.current = true;
    setGroups(updatedGroups);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');

    try {
      await onUpdate(updatedGroups);
      setSaveStatus('saved');

      // Reset to idle after 2 seconds
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error: any) {
      setSaveStatus('error');
      toast({
        variant: 'destructive',
        title: t('processFlow.saveFailed'),
        description: error.message || t('messages.error'),
      });

      // Reset to idle after 3 seconds for errors
      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [onUpdate, toast, t]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Group operations
  const addGroup = () => {
    const newGroup: ProcessGroup = {
      id: `group-${Date.now()}`,
      title: t('processFlow.groupTitle'),
      order: groups.length + 1,
      processSteps: [],
    };
    const updated = [...groups, newGroup];
    setExpandedGroups(new Set([...expandedGroups, newGroup.id]));
    autoSave(updated);
  };

  const updateGroupTitle = useCallback(async (groupId: string, newTitle: string) => {
    const updated = groups.map((g) =>
      g.id === groupId ? { ...g, title: newTitle } : g
    );
    await autoSave(updated);
  }, [groups, autoSave]);

  const deleteGroup = (groupId: string) => {
    if (confirm(t('processFlow.deleteGroupConfirm'))) {
      const updated = groups.filter((g) => g.id !== groupId);
      autoSave(updated);
    }
  };

  // Step operations
  const addStep = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const newStep: ProcessStep = {
      id: `step-${Date.now()}`,
      title: t('processFlow.stepTitle'),
      order: group.processSteps.length + 1,
      outputs: [],
      durations: [],
      responsible: '',
      descriptions: [],
    };

    const updated = groups.map((g) =>
      g.id === groupId
        ? { ...g, processSteps: [...g.processSteps, newStep] }
        : g
    );
    setExpandedSteps(new Set([...expandedSteps, newStep.id]));
    autoSave(updated);
  };

  const updateStepField = useCallback(async (
    groupId: string,
    stepId: string,
    field: keyof ProcessStep,
    value: any
  ) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        processSteps: g.processSteps.map((s) =>
          s.id === stepId ? { ...s, [field]: value } : s
        ),
      };
    });
    await autoSave(updated);
  }, [groups, autoSave]);

  const deleteStep = (groupId: string, stepId: string) => {
    if (confirm(t('processFlow.deleteStepConfirm'))) {
      const updated = groups.map((g) =>
        g.id === groupId
          ? { ...g, processSteps: g.processSteps.filter((s) => s.id !== stepId) }
          : g
      );
      autoSave(updated);
    }
  };

  // Array field operations (outputs, durations)
  const addArrayItem = useCallback(async (groupId: string, stepId: string, field: 'outputs' | 'durations', value: string) => {
    if (!value.trim()) return;

    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        processSteps: g.processSteps.map((s) =>
          s.id === stepId ? { ...s, [field]: [...s[field], value.trim()] } : s
        ),
      };
    });
    await autoSave(updated);
  }, [groups, autoSave]);

  const removeArrayItem = useCallback(async (groupId: string, stepId: string, field: 'outputs' | 'durations', index: number) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        processSteps: g.processSteps.map((s) =>
          s.id === stepId
            ? { ...s, [field]: s[field].filter((_, i) => i !== index) }
            : s
        ),
      };
    });
    await autoSave(updated);
  }, [groups, autoSave]);

  // Drag and drop handlers
  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);

      const reordered = arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({
        ...g,
        order: idx + 1,
      }));

      autoSave(reordered);
    }
  };

  const handleStepDragEnd = (groupId: string) => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const updated = groups.map((g) => {
        if (g.id !== groupId) return g;

        const oldIndex = g.processSteps.findIndex((s) => s.id === active.id);
        const newIndex = g.processSteps.findIndex((s) => s.id === over.id);

        const reordered = arrayMove(g.processSteps, oldIndex, newIndex).map((s, idx) => ({
          ...s,
          order: idx + 1,
        }));

        return { ...g, processSteps: reordered };
      });

      autoSave(updated);
    }
  };

  if (groups.length === 0 && readOnly) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>{t('processFlow.emptyState')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0 && !readOnly) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <List className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="mb-4 text-muted-foreground">{t('processFlow.emptyState')}</p>
            <p className="mb-4 text-sm text-muted-foreground">{t('processFlow.emptyStateDescription')}</p>
            <Button onClick={addGroup}>
              <Plus className="h-4 w-4 mr-2" />
              {t('processFlow.addGroup')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>{t('processFlow.title')}</CardTitle>
            {!readOnly && saveStatus !== 'idle' && (
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Save failed</span>
                  </>
                )}
              </div>
            )}
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={addGroup}>
              <Plus className="h-4 w-4 mr-2" />
              {t('processFlow.addGroup')}
            </Button>
          )}
        </div>
        {readOnly && (
          <p className="text-sm text-muted-foreground mt-2">
            {t('processFlow.readOnlyNote')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleGroupDragEnd}
        >
          <SortableContext
            items={groups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group, groupIndex) => {
              const isGroupExpanded = expandedGroups.has(group.id);

              return (
                <SortableGroup key={group.id} id={group.id}>
                  <div className="space-y-3">
                    {/* Process Group Header */}
                    <div className="relative group/header">
                      <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                        {!readOnly && (
                          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 cursor-move" />
                        )}
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="flex-shrink-0"
                        >
                          {isGroupExpanded ? (
                            <ChevronDown className="h-5 w-5 text-primary" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-primary" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default" className="font-mono">
                              {group.order}
                            </Badge>
                            {readOnly ? (
                              <h3 className="font-semibold text-lg">{group.title}</h3>
                            ) : (
                              <InlineEditable
                                value={group.title}
                                onSave={(newTitle) => updateGroupTitle(group.id, newTitle)}
                                displayClassName="font-semibold text-lg"
                                autoSave={true}
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {group.processSteps.length} step{group.processSteps.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {!readOnly && (
                          <div className="flex gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addStep(group.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteGroup(group.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Process Steps */}
                    {isGroupExpanded && (
                      <div className="ml-8 space-y-3">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleStepDragEnd(group.id)}
                        >
                          <SortableContext
                            items={group.processSteps.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {group.processSteps.map((step, stepIndex) => {
                              const isStepExpanded = expandedSteps.has(step.id);

                              return (
                                <SortableStep key={step.id} id={step.id}>
                                  <div className="space-y-2">
                                    {/* Process Step Header */}
                                    <div className="relative group/step">
                                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                                        {!readOnly && (
                                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-move" />
                                        )}
                                        <button
                                          onClick={() => toggleStep(step.id)}
                                          className="flex-shrink-0"
                                        >
                                          {isStepExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </button>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="font-mono text-xs">
                                              {group.order}.{step.order}
                                            </Badge>
                                            {readOnly ? (
                                              <span className="font-medium">{step.title}</span>
                                            ) : (
                                              <InlineEditable
                                                value={step.title}
                                                onSave={(newTitle) =>
                                                  updateStepField(group.id, step.id, 'title', newTitle)
                                                }
                                                displayClassName="font-medium"
                                                autoSave={true}
                                              />
                                            )}
                                          </div>
                                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            {step.responsible && (
                                              <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span>{step.responsible}</span>
                                              </div>
                                            )}
                                            {step.outputs.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <FileOutput className="h-3 w-3" />
                                                <span>{step.outputs.length} output{step.outputs.length !== 1 ? 's' : ''}</span>
                                              </div>
                                            )}
                                            {step.durations.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{step.durations.length} duration{step.durations.length !== 1 ? 's' : ''}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {!readOnly && (
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="opacity-0 group-hover/step:opacity-100 transition-opacity"
                                            onClick={() => deleteStep(group.id, step.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Process Step Details */}
                                    {isStepExpanded && (
                                      <div className="ml-6 space-y-3 p-4 rounded-lg border bg-muted/30">
                                        {/* Responsible */}
                                        <div>
                                          <label className="text-sm font-medium mb-1 block">{t('processFlow.responsible')}</label>
                                          {readOnly ? (
                                            <p className="text-sm">{step.responsible || t('processFlow.responsiblePlaceholder')}</p>
                                          ) : (
                                            <InlineEditable
                                              value={step.responsible}
                                              onSave={(value) =>
                                                updateStepField(group.id, step.id, 'responsible', value)
                                              }
                                              placeholder={t('processFlow.responsiblePlaceholder')}
                                              autoSave={true}
                                            />
                                          )}
                                        </div>

                                        {/* Outputs */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <FileOutput className="h-4 w-4 text-muted-foreground" />
                                            <h4 className="font-semibold text-sm">{t('processFlow.outputs')}</h4>
                                          </div>
                                          {step.outputs.length > 0 ? (
                                            <ul className="list-disc list-inside space-y-1 mb-2">
                                              {step.outputs.map((output, idx) => (
                                                <li key={idx} className="text-sm flex items-center justify-between group/item">
                                                  <span>{output}</span>
                                                  {!readOnly && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="opacity-0 group-hover/item:opacity-100"
                                                      onClick={() => removeArrayItem(group.id, step.id, 'outputs', idx)}
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </Button>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : readOnly ? (
                                            <p className="text-sm text-muted-foreground">{t('processFlow.outputsEmpty')}</p>
                                          ) : null}
                                          {!readOnly && (
                                            <InlineEditable
                                              value=""
                                              onSave={(value) => addArrayItem(group.id, step.id, 'outputs', value)}
                                              placeholder={t('processFlow.outputPlaceholder')}
                                              autoSave={false}
                                            />
                                          )}
                                        </div>

                                        {/* Durations */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <h4 className="font-semibold text-sm">{t('processFlow.durations')}</h4>
                                          </div>
                                          {step.durations.length > 0 ? (
                                            <ul className="list-disc list-inside space-y-1 mb-2">
                                              {step.durations.map((duration, idx) => (
                                                <li key={idx} className="text-sm flex items-center justify-between group/item">
                                                  <span>{duration}</span>
                                                  {!readOnly && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="opacity-0 group-hover/item:opacity-100"
                                                      onClick={() => removeArrayItem(group.id, step.id, 'durations', idx)}
                                                    >
                                                      <X className="h-3 w-3" />
                                                    </Button>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : readOnly ? (
                                            <p className="text-sm text-muted-foreground">{t('processFlow.durationsEmpty')}</p>
                                          ) : null}
                                          {!readOnly && (
                                            <InlineEditable
                                              value=""
                                              onSave={(value) => addArrayItem(group.id, step.id, 'durations', value)}
                                              placeholder={t('processFlow.durationPlaceholder')}
                                              autoSave={false}
                                            />
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Arrow between steps */}
                                    {stepIndex < group.processSteps.length - 1 && (
                                      <div className="flex items-center justify-center py-1">
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </SortableStep>
                              );
                            })}
                          </SortableContext>
                        </DndContext>

                        {/* Add Step Button */}
                        {!readOnly && group.processSteps.length === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addStep(group.id)}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('processFlow.addStep')}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Separator between groups */}
                    {groupIndex < groups.length - 1 && <Separator className="my-4" />}
                  </div>
                </SortableGroup>
              );
            })}
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
};
