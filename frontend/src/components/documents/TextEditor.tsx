'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface TextEditorProps {
  initialContent?: {
    text?: string;
  };
  onChange?: (content: { text: string }) => void;
  readOnly?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  initialContent = { text: '' },
  onChange,
  readOnly = false,
}) => {
  const [text, setText] = useState(initialContent.text || '');
  const initialTextRef = useRef(initialContent.text || '');
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Only update from initialContent on mount
  useEffect(() => {
    initialTextRef.current = initialContent.text || '';
    setText(initialContent.text || '');
  }, []);

  const handleTextChange = useCallback((value: string) => {
    setText(value);

    // Debounce the onChange callback to prevent too many updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange?.({ text: value });
    }, 1000); // Save after 1 second of no typing
  }, [onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <RichTextEditor
        content={text}
        onChange={handleTextChange}
        placeholder="Enter text content..."
        readOnly={readOnly}
        minHeight="300px"
      />
    </div>
  );
};
