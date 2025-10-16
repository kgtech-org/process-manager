'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setText(initialContent.text || '');
  }, [initialContent.text]);

  const handleTextChange = (value: string) => {
    setText(value);
    onChange?.({ text: value });
  };

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
