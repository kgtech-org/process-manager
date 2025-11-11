'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StakeholderSelect } from '@/components/process/StakeholderSelect';
import { TaskManager, TaskItem } from '@/components/process/TaskManager';
import { MacroResource, Macro } from '@/lib/resources/macro';
import { createProcessSchema, CreateProcessData } from '@/lib/validation/process';
import { generateProcessCode, generateTaskCode } from '@/lib/utils/codeGenerator';
import { apiClient } from '@/lib/api';

const STEPS = [
  { number: 1, title: 'Select Macro', description: 'Choose the macro for this process' },
  { number: 2, title: 'Process Information', description: 'Enter process details' },
  { number: 3, title: 'Add Tasks', description: 'Define process tasks' },
  { number: 4, title: 'Review & Submit', description: 'Review and submit' },
];

export default function ProcessCreationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateProcessData>({
    resolver: zodResolver(createProcessSchema),
    defaultValues: {
      macroId: '',
      title: '',
      shortDescription: '',
      description: '',
      stakeholders: [],
      isActive: true,
      tasks: [],
      version: '1.0',
      reference: '',
    },
  });

  // Load macros on mount
  useEffect(() => {
    const loadMacros = async () => {
      try {
        setLoading(true);
        const response = await MacroResource.getAll({ page: 1, limit: 100 });
        setMacros(response.data);
      } catch (error) {
        console.error('Failed to load macros:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMacros();
  }, []);

  // When macro is selected, generate process code and initial task
  const handleMacroSelect = async (macroId: string) => {
    const macro = macros.find((m) => m.id === macroId);
    if (!macro) return;

    setSelectedMacro(macro);
    form.setValue('macroId', macroId);

    // Generate process code
    const processCount = macro.processCount || 0;
    const processCode = generateProcessCode(macro.code, processCount);
    form.setValue('processCode', processCode);

    // Initialize with one task
    const initialTask: TaskItem = {
      code: generateTaskCode(processCode, 1),
      description: '',
      order: 1,
    };
    form.setValue('tasks', [initialTask]);
  };

  const handleNext = async () => {
    let isValid = false;

    // Validate current step
    if (currentStep === 1) {
      isValid = await form.trigger(['macroId']);
    } else if (currentStep === 2) {
      isValid = await form.trigger(['title', 'description']);
    } else if (currentStep === 3) {
      isValid = await form.trigger(['tasks']);
    }

    if (isValid || currentStep === 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (data: CreateProcessData) => {
    try {
      setSubmitting(true);

      const response = await apiClient.post('/documents', {
        ...data,
        contributors: {
          authors: [],
          verifiers: [],
          validators: [],
        },
        metadata: {
          objectives: [],
          implicatedActors: data.stakeholders || [],
          managementRules: [],
          terminology: [],
          changeHistory: [],
        },
        processGroups: [],
        annexes: [],
      });

      if (response.success) {
        router.push(`/macros/${data.macroId}`);
      } else {
        alert('Failed to create process: ' + response.message);
      }
    } catch (error: any) {
      console.error('Failed to create process:', error);
      alert('Failed to create process: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/macros')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Macros
        </Button>
        <h1 className="text-3xl font-bold mb-2">Create New Process</h1>
        <p className="text-gray-600">
          Follow the steps to create a new process with tasks
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep > step.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : currentStep === step.number
                      ? 'border-blue-600 text-blue-600'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step.number}</span>
                  )}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Step 1: Macro Selection */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Macro</CardTitle>
                <CardDescription>
                  Choose the macro that this process belongs to
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="macroId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="grid gap-3">
                            {macros.map((macro) => (
                              <button
                                key={macro.id}
                                type="button"
                                onClick={() => {
                                  field.onChange(macro.id);
                                  handleMacroSelect(macro.id);
                                }}
                                className={`p-4 border-2 rounded-lg text-left transition-all ${
                                  field.value === macro.id
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="secondary">{macro.code}</Badge>
                                      {macro.isActive && (
                                        <Badge variant="default" className="text-xs">
                                          Active
                                        </Badge>
                                      )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900">{macro.name}</h3>
                                    {macro.shortDescription && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {macro.shortDescription}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                      {macro.processCount || 0} process(es)
                                    </p>
                                  </div>
                                  {field.value === macro.id && (
                                    <Check className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Process Information */}
          {currentStep === 2 && selectedMacro && (
            <Card>
              <CardHeader>
                <CardTitle>Process Information</CardTitle>
                <CardDescription>
                  Enter the details for this process under {selectedMacro.code} - {selectedMacro.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Process Code (Read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-2">Process Code</label>
                  <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md font-mono text-sm">
                    {form.watch('processCode')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated based on macro and existing processes
                  </p>
                </div>

                {/* Process Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Analyze business and technology needs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Short Description */}
                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Brief one-line summary"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: A brief summary of this process
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={6}
                          placeholder="Detailed description of what this process does, when it's used, and its objectives..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stakeholders */}
                <FormField
                  control={form.control}
                  name="stakeholders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stakeholders / Departments</FormLabel>
                      <FormControl>
                        <StakeholderSelect
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Select departments or stakeholders involved in this process
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Active Status */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="mb-0">Mark as Active</FormLabel>
                        <FormDescription className="mt-0">
                          Active processes are visible and available for use
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Tasks */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Process Tasks</CardTitle>
                <CardDescription>
                  Define the tasks for this process. You can reorder them by dragging.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="tasks"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TaskManager
                          processCode={form.watch('processCode') || ''}
                          tasks={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && selectedMacro && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>
                  Review all information before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Macro */}
                <div>
                  <h3 className="font-semibold mb-2">Macro</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedMacro.code}</Badge>
                      <span className="font-medium">{selectedMacro.name}</span>
                    </div>
                  </div>
                </div>

                {/* Process Info */}
                <div>
                  <h3 className="font-semibold mb-2">Process Information</h3>
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Code:</span>
                      <p className="font-mono">{form.watch('processCode')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Name:</span>
                      <p className="font-medium">{form.watch('title')}</p>
                    </div>
                    {form.watch('shortDescription') && (
                      <div>
                        <span className="text-sm text-gray-600">Short Description:</span>
                        <p>{form.watch('shortDescription')}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-600">Description:</span>
                      <p className="whitespace-pre-wrap">{form.watch('description')}</p>
                    </div>
                    {form.watch('stakeholders') && form.watch('stakeholders')!.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Stakeholders:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {form.watch('stakeholders')!.map((stakeholder) => (
                            <Badge key={stakeholder} variant="outline">
                              {stakeholder}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={form.watch('isActive') ? 'default' : 'secondary'}>
                        {form.watch('isActive') ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  <h3 className="font-semibold mb-2">
                    Tasks ({form.watch('tasks').length})
                  </h3>
                  <div className="space-y-2">
                    {form.watch('tasks').map((task, index) => (
                      <div
                        key={task.code}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-semibold text-gray-600">
                            {index + 1}.
                          </span>
                          <div className="flex-1">
                            <p className="text-xs font-mono text-gray-600 mb-1">
                              {task.code}
                            </p>
                            <p>{task.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Process'}
                <FileText className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
