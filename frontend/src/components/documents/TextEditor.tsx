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
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Only update if initial content actually changes from outside
    if (!isInitialMount.current && initialContent.text !== text) {
      setText(initialContent.text || '');
    }
    isInitialMount.current = false;
  }, [initialContent.text]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    onChange?.({ text: value });
  }, [onChange]);

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
