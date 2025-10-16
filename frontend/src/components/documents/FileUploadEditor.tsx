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

      // Get access token from localStorage
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(`/api/documents/${documentId}/annexes/${annexId}/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
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
      // Get access token from localStorage
      const accessToken = localStorage.getItem('access_token');

      await fetch(`/api/documents/${documentId}/annexes/${annexId}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
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

      {/* Files Grid */}
      {files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <Card key={file.id} className="overflow-hidden group">
              {/* File Preview/Thumbnail */}
              <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : file.type.includes('pdf') ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2" />
                    <span className="text-xs">PDF Document</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileIcon className="h-12 w-12 mb-2" />
                    <span className="text-xs">File</span>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={() => handlePreview(file)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      onClick={() => handleRemoveFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
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
