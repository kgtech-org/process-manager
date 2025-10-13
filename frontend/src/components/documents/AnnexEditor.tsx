'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, Table as TableIcon, Image, File } from 'lucide-react';
import { DiagramEditor } from './DiagramEditor';
import { TextEditor } from './TextEditor';
import { TableEditor } from './TableEditor';
import type { Annex, AnnexType } from '@/lib/resources/document';
import { useToast } from '@/hooks/use-toast';

interface AnnexEditorProps {
  documentId: string;
  annexes: Annex[];
  onCreateAnnex: (annex: { title: string; type: AnnexType; content: any }) => Promise<void>;
  onUpdateAnnex: (annexId: string, updates: { title?: string; type?: AnnexType; content?: any }) => Promise<void>;
  onDeleteAnnex: (annexId: string) => Promise<void>;
  readOnly?: boolean;
}

export const AnnexEditor: React.FC<AnnexEditorProps> = ({
  documentId,
  annexes,
  onCreateAnnex,
  onUpdateAnnex,
  onDeleteAnnex,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAnnexId, setEditingAnnexId] = useState<string | null>(null);
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [currentDiagramAnnex, setCurrentDiagramAnnex] = useState<Annex | null>(null);
  const [newAnnexTitle, setNewAnnexTitle] = useState('');
  const [newAnnexType, setNewAnnexType] = useState<AnnexType>('text');
  const [editContent, setEditContent] = useState<any>(null);

  const getAnnexIcon = (type: AnnexType) => {
    switch (type) {
      case 'diagram':
        return <Image className="h-4 w-4" />;
      case 'table':
        return <TableIcon className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
    }
  };

  const handleCreateAnnex = async () => {
    if (!newAnnexTitle.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title is required',
      });
      return;
    }

    try {
      const initialContent = getInitialContent(newAnnexType);
      await onCreateAnnex({
        title: newAnnexTitle,
        type: newAnnexType,
        content: initialContent,
      });
      setIsCreateModalOpen(false);
      setNewAnnexTitle('');
      setNewAnnexType('text');
      toast({
        title: 'Annex created successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create annex',
        description: error.message,
      });
    }
  };

  const handleUpdateContent = async (annexId: string, content: any) => {
    try {
      await onUpdateAnnex(annexId, { content });
      toast({
        title: 'Annex updated successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update annex',
        description: error.message,
      });
    }
  };

  const handleDeleteAnnex = async (annexId: string) => {
    if (!confirm('Are you sure you want to delete this annex?')) return;

    try {
      await onDeleteAnnex(annexId);
      toast({
        title: 'Annex deleted successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete annex',
        description: error.message,
      });
    }
  };

  const getInitialContent = (type: AnnexType) => {
    switch (type) {
      case 'diagram':
        return { shapes: [] };
      case 'table':
        return { headers: [], rows: [] };
      case 'text':
        return { text: '', sections: [] };
      case 'file':
        return { files: [] };
      default:
        return {};
    }
  };

  const openDiagramModal = (annex: Annex) => {
    setCurrentDiagramAnnex(annex);
    setDiagramModalOpen(true);
  };

  const renderAnnexContent = (annex: Annex) => {
    const isEditing = editingAnnexId === annex.id;

    switch (annex.type) {
      case 'diagram':
        if (readOnly || !isEditing) {
          // Read-only preview
          return (
            <div className="relative">
              <DiagramEditor
                initialShapes={annex.content?.shapes || []}
                onChange={() => {}}
                readOnly={true}
              />
              {!readOnly && (
                <Button
                  onClick={() => {
                    setEditingAnnexId(annex.id);
                    openDiagramModal(annex);
                  }}
                  className="absolute top-2 right-2"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Diagram
                </Button>
              )}
            </div>
          );
        }
        return (
          <Button
            onClick={() => openDiagramModal(annex)}
            variant="outline"
            className="w-full"
          >
            <Edit className="h-4 w-4 mr-2" />
            Open Diagram Editor
          </Button>
        );

      case 'table':
        return (
          <TableEditor
            initialContent={{
              headers: annex.content?.headers || [],
              rows: annex.content?.rows || [],
            }}
            onChange={(content) => handleUpdateContent(annex.id, content)}
            readOnly={readOnly || !isEditing}
          />
        );

      case 'text':
        return (
          <TextEditor
            initialContent={{
              text: annex.content?.text || '',
              sections: annex.content?.sections || [],
            }}
            onChange={(content) => handleUpdateContent(annex.id, content)}
            readOnly={readOnly || !isEditing}
          />
        );

      case 'file':
        return (
          <div className="text-sm text-muted-foreground">
            File upload functionality coming soon
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Annexes</CardTitle>
            {!readOnly && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Annex
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Annex</DialogTitle>
                    <DialogDescription>
                      Add a new annex to the document. Choose the type and provide a title.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title</label>
                      <Input
                        placeholder="Enter annex title..."
                        value={newAnnexTitle}
                        onChange={(e) => setNewAnnexTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type</label>
                      <Select
                        value={newAnnexType}
                        onValueChange={(value) => setNewAnnexType(value as AnnexType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diagram">Diagram</SelectItem>
                          <SelectItem value="table">Table</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateAnnex}>Create Annex</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        {annexes.length === 0 && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No annexes yet</p>
              {!readOnly && (
                <p className="text-xs mt-1">Click "Add Annex" to create one</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Annex List */}
      {annexes.map((annex) => (
        <Card key={annex.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getAnnexIcon(annex.type)}
                <div>
                  <CardTitle className="text-lg">{annex.title}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    {annex.type}
                  </Badge>
                </div>
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  {editingAnnexId === annex.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAnnexId(null)}
                    >
                      Done Editing
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAnnexId(annex.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAnnex(annex.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>{renderAnnexContent(annex)}</CardContent>
        </Card>
      ))}

      {/* Full-screen Diagram Editor Modal */}
      <Dialog open={diagramModalOpen} onOpenChange={setDiagramModalOpen}>
        <DialogContent className="max-w-[98vw] w-full h-[98vh] max-h-[98vh] p-0">
          <div className="h-full flex flex-col">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>
                {currentDiagramAnnex?.title || 'Diagram Editor'}
              </DialogTitle>
              <DialogDescription>
                Create and edit your diagram with zoom and customization tools
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4">
              {currentDiagramAnnex && (
                <DiagramEditor
                  initialShapes={currentDiagramAnnex.content?.shapes || []}
                  onChange={(shapes) => handleUpdateContent(currentDiagramAnnex.id, { shapes })}
                  readOnly={false}
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDiagramModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
