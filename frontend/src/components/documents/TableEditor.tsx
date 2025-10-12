'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, X, Trash2 } from 'lucide-react';

interface TableEditorProps {
  initialContent?: {
    headers?: string[];
    rows?: string[][];
  };
  onChange?: (content: { headers: string[]; rows: string[][] }) => void;
  readOnly?: boolean;
}

export const TableEditor: React.FC<TableEditorProps> = ({
  initialContent = { headers: [], rows: [] },
  onChange,
  readOnly = false,
}) => {
  const [headers, setHeaders] = useState<string[]>(initialContent.headers || []);
  const [rows, setRows] = useState<string[][]>(initialContent.rows || []);
  const [newHeader, setNewHeader] = useState('');

  const addColumn = () => {
    if (!newHeader.trim()) return;
    const updatedHeaders = [...headers, newHeader.trim()];
    const updatedRows = rows.map((row) => [...row, '']);
    setHeaders(updatedHeaders);
    setRows(updatedRows);
    setNewHeader('');
    onChange?.({ headers: updatedHeaders, rows: updatedRows });
  };

  const removeColumn = (index: number) => {
    const updatedHeaders = headers.filter((_, i) => i !== index);
    const updatedRows = rows.map((row) => row.filter((_, i) => i !== index));
    setHeaders(updatedHeaders);
    setRows(updatedRows);
    onChange?.({ headers: updatedHeaders, rows: updatedRows });
  };

  const addRow = () => {
    const updatedRows = [...rows, Array(headers.length).fill('')];
    setRows(updatedRows);
    onChange?.({ headers, rows: updatedRows });
  };

  const removeRow = (rowIndex: number) => {
    const updatedRows = rows.filter((_, i) => i !== rowIndex);
    setRows(updatedRows);
    onChange?.({ headers, rows: updatedRows });
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = rows.map((row, i) =>
      i === rowIndex ? row.map((cell, j) => (j === colIndex ? value : cell)) : row
    );
    setRows(updatedRows);
    onChange?.({ headers, rows: updatedRows });
  };

  const updateHeader = (index: number, value: string) => {
    const updatedHeaders = headers.map((h, i) => (i === index ? value : h));
    setHeaders(updatedHeaders);
    onChange?.({ headers: updatedHeaders, rows });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addColumn();
    }
  };

  if (headers.length === 0 && readOnly) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No table data defined
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Column */}
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="Enter column header..."
            value={newHeader}
            onChange={(e) => setNewHeader(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addColumn}
            disabled={!newHeader.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
        </div>
      )}

      {/* Table */}
      {headers.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index} className="relative group">
                    {readOnly ? (
                      <span>{header}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          value={header}
                          onChange={(e) => updateHeader(index, e.target.value)}
                          className="h-8 text-sm font-medium"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          onClick={() => removeColumn(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableHead>
                ))}
                {!readOnly && (
                  <TableHead className="w-[50px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="group">
                  {row.map((cell, colIndex) => (
                    <TableCell key={colIndex}>
                      {readOnly ? (
                        <span className="text-sm">{cell || '—'}</span>
                      ) : (
                        <Input
                          value={cell}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                    </TableCell>
                  ))}
                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => removeRow(rowIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Row */}
      {!readOnly && headers.length > 0 && (
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      )}
    </div>
  );
};
