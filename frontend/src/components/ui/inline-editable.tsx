'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineEditableProps {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  editMode?: boolean;
  autoSave?: boolean;
}

export const InlineEditable: React.FC<InlineEditableProps> = ({
  value,
  onSave,
  multiline = false,
  placeholder = 'Click to edit',
  className = '',
  displayClassName = '',
  editMode: externalEditMode,
  autoSave = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const onSaveRef = useRef(onSave);

  // Keep onSaveRef updated
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Sync with external value changes (only when not editing)
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Auto-enable edit mode when external edit mode is active
  useEffect(() => {
    if (externalEditMode && !isEditing) {
      setIsEditing(true);
    }
  }, [externalEditMode]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Save on unmount if editing and autoSave is enabled
  useEffect(() => {
    return () => {
      if (isEditing && autoSave && localValue.trim() !== value.trim() && !isSaving) {
        // Synchronous save on unmount to ensure data isn't lost
        onSaveRef.current(localValue.trim());
      }
    };
  }, [isEditing, autoSave, localValue, value, isSaving]);

  const handleSave = async () => {
    if (localValue.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(localValue.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      setLocalValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      if (autoSave) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      if (autoSave) {
        handleSave();
      }
    }
  };

  const handleBlur = () => {
    if (autoSave && !isSaving) {
      handleSave();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;
    return (
      <div className={`flex items-start gap-2 ${className}`}>
        <InputComponent
          ref={inputRef as any}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isSaving}
          className="flex-1"
        />
        {!autoSave && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors ${displayClassName}`}
      onClick={() => setIsEditing(true)}
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      {externalEditMode && (
        <Pencil className="inline-block ml-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};
