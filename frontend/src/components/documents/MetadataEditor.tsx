'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MetadataEditorProps {
  documentId: string;
  metadata: {
    objectives: string[];
    implicatedActors: string[];
    managementRules: string[];
    terminology: string[];
  };
  onUpdate: (metadata: any) => Promise<void>;
  readOnly?: boolean;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({
  documentId,
  metadata: initialMetadata,
  onUpdate,
  readOnly = false,
}) => {
  const { t } = useTranslation('documents');
  const { toast } = useToast();
  const [metadata, setMetadata] = useState(initialMetadata);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [newItems, setNewItems] = useState({
    objectives: '',
    implicatedActors: '',
    managementRules: '',
    terminology: '',
  });

  const saveMetadata = useCallback(async (updatedMetadata: typeof metadata) => {
    setSaveStatus('saving');
    try {
      await onUpdate(updatedMetadata);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      setSaveStatus('error');
      toast({
        variant: 'destructive',
        title: 'Failed to update metadata',
        description: error.message || 'An error occurred',
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [onUpdate, toast]);

  const addItem = useCallback(async (field: keyof typeof newItems) => {
    const value = newItems[field].trim();
    if (!value) return;

    const updatedMetadata = {
      ...metadata,
      [field]: [...metadata[field], value],
    };
    setMetadata(updatedMetadata);
    setNewItems({ ...newItems, [field]: '' });
    await saveMetadata(updatedMetadata);
  }, [metadata, newItems, saveMetadata]);

  const removeItem = useCallback(async (field: keyof typeof metadata, index: number) => {
    const updatedMetadata = {
      ...metadata,
      [field]: metadata[field].filter((_, i) => i !== index),
    };
    setMetadata(updatedMetadata);
    await saveMetadata(updatedMetadata);
  }, [metadata, saveMetadata]);

  const handleKeyPress = useCallback((field: keyof typeof newItems, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(field);
    }
  }, [addItem]);

  const renderSection = (
    field: keyof typeof metadata,
    title: string,
    placeholder: string,
    emptyText: string
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        {!readOnly && saveStatus !== 'idle' && (
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <XCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Failed</span>
              </>
            )}
          </div>
        )}
      </div>

      {metadata[field].length > 0 ? (
        <ul className="list-disc list-inside space-y-1 mb-2">
          {metadata[field].map((item, index) => (
            <li key={index} className="text-sm flex items-center justify-between group">
              <span className="flex-1">{item}</span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  onClick={() => removeItem(field, index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
      )}

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={newItems[field]}
            onChange={(e) => setNewItems({ ...newItems, [field]: e.target.value })}
            onKeyPress={(e) => handleKeyPress(field, e)}
            className="text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => addItem(field)}
            disabled={!newItems[field].trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Objectives */}
        {renderSection(
          'objectives',
          'Objectives',
          'Enter a new objective...',
          'No objectives defined'
        )}

        {/* Implicated Actors */}
        {renderSection(
          'implicatedActors',
          'Implicated Actors',
          'Enter a new actor...',
          'No actors defined'
        )}

        {/* Management Rules */}
        {renderSection(
          'managementRules',
          'Management Rules',
          'Enter a new rule...',
          'No rules defined'
        )}

        {/* Terminology */}
        {renderSection(
          'terminology',
          'Terminology',
          'Enter a new term (e.g., "API: Application Programming Interface")...',
          'No terminology defined'
        )}
      </CardContent>
    </Card>
  );
};
