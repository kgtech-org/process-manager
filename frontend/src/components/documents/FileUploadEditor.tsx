'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, FileText, Image as ImageIcon, File as FileIcon, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
}

interface FileUploadEditorProps {
  documentId: string;
  annexId: string;
  initialFiles?: FileItem[];
  onChange?: (files: FileItem[]) => void;
  readOnly?: boolean;
}

export const FileUploadEditor: React.FC<FileUploadEditorProps> = ({
  documentId,
  annexId,
  initialFiles = [],
  onChange,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (type.includes('pdf')) {
      return <FileText className="h-5 w-5" />;
    }
    return <FileIcon className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);

    try {
      // Upload files to server
      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file);
      });

      // TODO: Replace with actual API call
      const response = await fetch(`/api/documents/${documentId}/annexes/${annexId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const uploadedFiles: FileItem[] = await response.json();

      const updatedFiles = [...files, ...uploadedFiles];
      setFiles(updatedFiles);
      onChange?.(updatedFiles);

      toast({
        title: 'Files uploaded successfully',
        description: `${selectedFiles.length} file(s) uploaded`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload files',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to remove this file?')) return;

    try {
      // TODO: Replace with actual API call
      await fetch(`/api/documents/${documentId}/annexes/${annexId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const updatedFiles = files.filter((f) => f.id !== fileId);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);

      toast({
        title: 'File removed successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove file',
        description: error.message,
      });
    }
  };

  const handlePreview = (file: FileItem) => {
    if (file.type.startsWith('image/') || file.type.includes('pdf')) {
      setPreviewFile(file);
    } else {
      // For non-previewable files, trigger download
      window.open(file.url, '_blank');
    }
  };

  const handleDownload = (file: FileItem) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!readOnly && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <Button
            variant="outline"
            className="w-full h-32 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className={`h-8 w-8 ${uploading ? 'animate-pulse' : ''}`} />
              <div className="text-sm">
                {uploading ? 'Uploading...' : 'Click to upload files'}
              </div>
              <div className="text-xs text-muted-foreground">
                Images, PDFs, Documents (Max 10MB each)
              </div>
            </div>
          </Button>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getFileIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handlePreview(file)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFile(file.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No files uploaded yet</p>
          {!readOnly && (
            <p className="text-xs mt-1">Click the upload button above to add files</p>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewFile?.type.startsWith('image/') ? (
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="w-full h-auto"
              />
            ) : previewFile?.type.includes('pdf') ? (
              <iframe
                src={previewFile.url}
                className="w-full h-[70vh]"
                title={previewFile.name}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
