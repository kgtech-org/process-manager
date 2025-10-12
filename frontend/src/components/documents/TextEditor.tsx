'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

interface TextEditorProps {
  initialContent?: {
    text?: string;
    sections?: string[];
  };
  onChange?: (content: { text: string; sections: string[] }) => void;
  readOnly?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  initialContent = { text: '', sections: [] },
  onChange,
  readOnly = false,
}) => {
  const [text, setText] = useState(initialContent.text || '');
  const [sections, setSections] = useState<string[]>(initialContent.sections || []);
  const [newSection, setNewSection] = useState('');

  const handleTextChange = (value: string) => {
    setText(value);
    onChange?.({ text: value, sections });
  };

  const addSection = () => {
    if (!newSection.trim()) return;
    const updatedSections = [...sections, newSection.trim()];
    setSections(updatedSections);
    setNewSection('');
    onChange?.({ text, sections: updatedSections });
  };

  const removeSection = (index: number) => {
    const updatedSections = sections.filter((_, i) => i !== index);
    setSections(updatedSections);
    onChange?.({ text, sections: updatedSections });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSection();
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Text Content */}
      <div>
        <label className="text-sm font-medium mb-2 block">Content</label>
        {readOnly ? (
          <div className="whitespace-pre-wrap text-sm p-3 border rounded-md bg-muted/50">
            {text || 'No content'}
          </div>
        ) : (
          <Textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter text content..."
            rows={10}
            className="resize-y"
          />
        )}
      </div>

      {/* Sections */}
      <div>
        <label className="text-sm font-medium mb-2 block">Sections</label>
        {sections.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 mb-2">
            {sections.map((section, index) => (
              <li key={index} className="text-sm flex items-center justify-between group">
                <span className="flex-1">{section}</span>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={() => removeSection(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mb-2">No sections defined</p>
        )}

        {!readOnly && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter a new section..."
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addSection}
              disabled={!newSection.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
