'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileOutput,
  User,
  ArrowRight,
  List,
  Edit,
  Plus,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import type { ProcessGroup, ProcessStep, ProcessDescription } from '@/lib/resources/document';

interface ProcessFlowVisualizationProps {
  processGroups: ProcessGroup[];
  documentId?: string;
  canEdit?: boolean;
  onUpdate?: (processGroups: ProcessGroup[]) => Promise<void>;
}

export const ProcessFlowVisualization: React.FC<ProcessFlowVisualizationProps> = ({
  processGroups,
  documentId,
  canEdit = false,
  onUpdate,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [localGroups, setLocalGroups] = useState<ProcessGroup[]>(processGroups);

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

  const expandAll = () => {
    const allGroupIds = processGroups.map((g) => g.id);
    const allStepIds = processGroups.flatMap((g) =>
      g.processSteps.map((s) => s.id)
    );
    setExpandedGroups(new Set(allGroupIds));
    setExpandedSteps(new Set(allStepIds));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
    setExpandedSteps(new Set());
  };

  const handleAddGroup = () => {
    const newGroup: ProcessGroup = {
      id: `group-${Date.now()}`,
      title: 'New Process Group',
      order: localGroups.length + 1,
      processSteps: [],
    };
    setLocalGroups([...localGroups, newGroup]);
    setExpandedGroups(new Set([...Array.from(expandedGroups), newGroup.id]));
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Are you sure you want to delete this process group?')) {
      setLocalGroups(localGroups.filter((g) => g.id !== groupId));
    }
  };

  const handleSave = async () => {
    if (onUpdate) {
      try {
        await onUpdate(localGroups);
        setEditMode(false);
      } catch (error) {
        console.error('Failed to save process groups:', error);
      }
    }
  };

  const handleCancel = () => {
    setLocalGroups(processGroups);
    setEditMode(false);
  };

  const displayGroups = editMode ? localGroups : processGroups;

  if (!displayGroups || displayGroups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="mb-4">No process groups defined yet</p>
            {canEdit && (
              <Button onClick={() => { setEditMode(true); handleAddGroup(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Process Group
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Process Flow</CardTitle>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroup}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                >
                  Collapse All
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayGroups.map((group, groupIndex) => {
          const isGroupExpanded = expandedGroups.has(group.id);

          return (
            <div key={group.id} className="space-y-3">
              {/* Process Group Header */}
              <div className="relative">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                >
                  {isGroupExpanded ? (
                    <ChevronDown className="h-5 w-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono">
                        {group.order}
                      </Badge>
                      <h3 className="font-semibold text-lg">{group.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.processSteps.length} step{group.processSteps.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                {editMode && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Process Steps */}
              {isGroupExpanded && (
                <div className="ml-8 space-y-3">
                  {group.processSteps.map((step, stepIndex) => {
                    const isStepExpanded = expandedSteps.has(step.id);

                    return (
                      <div key={step.id} className="space-y-2">
                        {/* Process Step Header */}
                        <button
                          onClick={() => toggleStep(step.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                        >
                          {isStepExpanded ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {group.order}.{step.order}
                              </Badge>
                              <span className="font-medium">{step.title}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{step.responsible}</span>
                              </div>
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
                        </button>

                        {/* Process Step Details */}
                        {isStepExpanded && (
                          <div className="ml-6 space-y-3 p-4 rounded-lg border bg-muted/30">
                            {/* Outputs */}
                            {step.outputs.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <FileOutput className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-semibold text-sm">Outputs</h4>
                                </div>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                  {step.outputs.map((output, idx) => (
                                    <li key={idx} className="text-sm">{output}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Durations */}
                            {step.durations.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-semibold text-sm">Durations</h4>
                                </div>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                  {step.durations.map((duration, idx) => (
                                    <li key={idx} className="text-sm">{duration}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Descriptions */}
                            {step.descriptions && step.descriptions.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Detailed Instructions</h4>
                                <div className="space-y-3">
                                  {step.descriptions.map((desc, descIdx) => (
                                    <div key={descIdx} className="p-3 rounded border bg-card">
                                      <h5 className="font-medium text-sm mb-2">{desc.title}</h5>
                                      <ol className="list-decimal list-inside space-y-1 ml-2">
                                        {desc.instructions.map((instruction, instrIdx) => (
                                          <li key={instrIdx} className="text-sm text-muted-foreground">
                                            {instruction}
                                          </li>
                                        ))}
                                      </ol>
                                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                        {desc.outputIndex >= 0 && step.outputs[desc.outputIndex] && (
                                          <span>Output: {step.outputs[desc.outputIndex]}</span>
                                        )}
                                        {desc.durationIndex >= 0 && step.durations[desc.durationIndex] && (
                                          <span>Duration: {step.durations[desc.durationIndex]}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Arrow between steps */}
                        {stepIndex < group.processSteps.length - 1 && (
                          <div className="flex items-center justify-center py-1">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Separator between groups */}
              {groupIndex < displayGroups.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
