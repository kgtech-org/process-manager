'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowLeft, ArrowRight, Save, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentResource } from '@/lib/resources';
import type { CreateDocumentRequest } from '@/lib/resources/document';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface MultiStepFormProps {
  initialData?: Partial<CreateDocumentRequest>;
  documentId?: string;
  onSave?: (data: CreateDocumentRequest) => void;
}

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  initialData,
  documentId,
  onSave,
}) => {
  const { t } = useTranslation('documents');
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDocumentRequest>({
    reference: initialData?.reference || '',
    title: initialData?.title || '',
    version: initialData?.version || '1.0',
    contributors: initialData?.contributors || {
      authors: [],
      verifiers: [],
      validators: [],
    },
    metadata: initialData?.metadata || {
      objectives: [],
      implicatedActors: [],
      managementRules: [],
      terminology: [],
      changeHistory: [],
    },
    processGroups: initialData?.processGroups || [],
    annexes: initialData?.annexes || [],
  });

  const steps: Step[] = [
    {
      id: 1,
      title: t('form.steps.basicInfo.title'),
      description: t('form.steps.basicInfo.description'),
    },
    {
      id: 2,
      title: t('form.steps.metadata.title'),
      description: t('form.steps.metadata.description'),
    },
    {
      id: 3,
      title: t('form.steps.processGroups.title'),
      description: t('form.steps.processGroups.description'),
    },
    {
      id: 4,
      title: t('form.steps.annexes.title'),
      description: t('form.steps.annexes.description'),
    },
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      if (documentId) {
        await DocumentResource.update(documentId, formData);
        toast({
          title: t('messages.draftSaved'),
        });
      } else {
        const document = await DocumentResource.create(formData);
        toast({
          title: t('messages.draftSaved'),
        });
        router.push(`/documents/${document.id}`);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('messages.saveFailed'),
        description: error.message || t('messages.error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (documentId) {
        await DocumentResource.update(documentId, formData);
      } else {
        const document = await DocumentResource.create(formData);
        documentId = document.id;
      }

      toast({
        title: t('messages.createSuccess'),
      });
      router.push(`/documents/${documentId}`);
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

  const updateFormData = (field: keyof CreateDocumentRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Step Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    step.id < currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                  disabled={loading}
                >
                  {step.id < currentStep ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium ${
                      step.id === currentStep
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 transition-colors ${
                    step.id < currentStep
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card className="p-6">
        <div className="min-h-[400px]">
          {/* Step components will be rendered here */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 1: Basic Information</h3>
              <p>Basic info form will go here</p>
            </div>
          )}
          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 2: Metadata</h3>
              <p>Metadata form will go here</p>
            </div>
          )}
          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 3: Process Groups</h3>
              <p>Process groups builder will go here</p>
            </div>
          )}
          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 4: Annexes</h3>
              <p>Annexes manager will go here</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('form.previous')}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {t('form.saveDraft')}
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={loading}>
                {t('form.next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                <Send className="w-4 h-4 mr-2" />
                {t('form.submit')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
