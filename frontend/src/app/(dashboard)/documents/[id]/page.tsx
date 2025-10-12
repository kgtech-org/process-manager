'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentResource, type Document } from '@/lib/resources';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { ProcessFlowEditor } from '@/components/documents/ProcessFlowEditor';
import { ProcessFlowTableView } from '@/components/documents/ProcessFlowTableView';
import { MetadataEditor } from '@/components/documents/MetadataEditor';
import { AnnexEditor } from '@/components/documents/AnnexEditor';
import { InvitationModal, SignaturePanel } from '@/components/collaboration';
import { DocumentInvitationsList } from '@/components/invitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  Download,
  Copy,
  Trash2,
  Loader2,
  UserPlus,
  Send,
  FileText as FileTextIcon,
  Table as TableIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [processFlowView, setProcessFlowView] = useState<'document' | 'table'>('document');

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await DocumentResource.getById(documentId);
      setDocument(data);
    } catch (error: any) {
      const status = error.response?.status;
      const errorCode = error.response?.data?.code;

      if (status === 403 || errorCode === 'FORBIDDEN') {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to access this document. Please request an invitation from the document owner.',
        });
      } else if (status === 404) {
        toast({
          variant: 'destructive',
          title: 'Document Not Found',
          description: 'The requested document does not exist.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to load document',
          description: error.response?.data?.message || error.message || 'An error occurred',
        });
      }
      router.push('/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const duplicated = await DocumentResource.duplicate(documentId);
      toast({
        title: 'Document duplicated successfully',
      });
      router.push(`/documents/${duplicated.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to duplicate document',
        description: error.message || 'An error occurred',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await DocumentResource.delete(documentId);
      toast({
        title: 'Document deleted successfully',
      });
      router.push('/documents');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete document',
        description: error.message || 'An error occurred',
      });
    }
  };

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this document? All contributors will be notified to sign.')) return;

    try {
      await DocumentResource.publish(documentId);
      toast({
        title: 'Document published successfully',
        description: 'All contributors have been notified to sign the document.',
      });
      loadDocument(); // Reload to show updated status
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to publish document',
        description: error.message || 'An error occurred',
      });
    }
  };

  const handleProcessFlowUpdate = useCallback(async (processGroups: any) => {
    await DocumentResource.update(documentId, { processGroups, isAutosave: true });
    // Update local state to keep parent in sync (ProcessFlowEditor uses ref to prevent loop)
    setDocument((prev) => prev ? { ...prev, processGroups } : null);
  }, [documentId]);

  const handleMetadataUpdate = useCallback(async (metadata: any) => {
    await DocumentResource.updateMetadata(documentId, metadata);
    // Update local state
    setDocument((prev) => prev ? { ...prev, metadata } : null);
  }, [documentId]);

  const handleCreateAnnex = useCallback(async (annex: any) => {
    const createdAnnex = await DocumentResource.createAnnex(documentId, annex);
    // Reload document to get updated annexes
    await loadDocument();
  }, [documentId]);

  const handleUpdateAnnex = useCallback(async (annexId: string, updates: any) => {
    await DocumentResource.updateAnnex(documentId, annexId, updates);
    // Reload document to get updated annexes
    await loadDocument();
  }, [documentId]);

  const handleDeleteAnnex = useCallback(async (annexId: string) => {
    await DocumentResource.deleteAnnex(documentId, annexId);
    // Reload document to get updated annexes
    await loadDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const totalContributors =
    document.contributors.authors.length +
    document.contributors.verifiers.length +
    document.contributors.validators.length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
          <p className="text-muted-foreground">
            {document.reference} • Version {document.version}
          </p>
        </div>
        <DocumentStatusBadge status={document.status} />
      </div>

      <div className="flex gap-2">
        {document.status === 'draft' && (
          <Button onClick={handlePublish}>
            <Send className="h-4 w-4 mr-2" />
            Publish for Signature
          </Button>
        )}
        <Button onClick={() => setInvitationModalOpen(true)} variant={document.status === 'draft' ? 'outline' : 'default'}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Collaborator
        </Button>
        <Button variant="outline" onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(document.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contributors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{totalContributors} people</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Process Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{document.processGroups.length} groups</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Document Tabs */}
      <Tabs defaultValue="process-flow" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="process-flow">Process Flow</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="annexes">Annexes</TabsTrigger>
          <TabsTrigger value="activity">Signatures & Contributors</TabsTrigger>
        </TabsList>

        {/* Process Flow Tab */}
        <TabsContent value="process-flow" className="space-y-4">
          {/* View Toggle */}
          <div className="flex justify-end gap-2">
            <Button
              variant={processFlowView === 'document' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProcessFlowView('document')}
            >
              <FileTextIcon className="h-4 w-4 mr-2" />
              Document View
            </Button>
            <Button
              variant={processFlowView === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProcessFlowView('table')}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Table View
            </Button>
          </div>

          {/* Conditional View Rendering */}
          {processFlowView === 'document' ? (
            <ProcessFlowEditor
              processGroups={document.processGroups}
              documentId={documentId}
              onUpdate={handleProcessFlowUpdate}
              readOnly={document.status !== 'draft'}
            />
          ) : (
            <ProcessFlowTableView
              processGroups={document.processGroups}
            />
          )}
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="space-y-4">
          <MetadataEditor
            documentId={documentId}
            metadata={{
              objectives: document.metadata?.objectives || [],
              implicatedActors: document.metadata?.implicatedActors || [],
              managementRules: document.metadata?.managementRules || [],
              terminology: document.metadata?.terminology || [],
            }}
            onUpdate={handleMetadataUpdate}
            readOnly={document.status !== 'draft'}
          />
        </TabsContent>

        {/* Annexes Tab */}
        <TabsContent value="annexes" className="space-y-4">
          <AnnexEditor
            documentId={documentId}
            annexes={document.annexes || []}
            onCreateAnnex={handleCreateAnnex}
            onUpdateAnnex={handleUpdateAnnex}
            onDeleteAnnex={handleDeleteAnnex}
            readOnly={document.status !== 'draft'}
          />
        </TabsContent>

        {/* Signatures & Contributors Tab */}
        <TabsContent value="activity" className="space-y-4">
          {/* Signatures & Contributors */}
          <SignaturePanel
            documentId={documentId}
            document={document}
            onSignatureAdded={loadDocument}
          />

          {/* Invitations */}
          <DocumentInvitationsList documentId={documentId} />
        </TabsContent>
      </Tabs>

      {/* Invitation Modal */}
      <InvitationModal
        documentId={documentId}
        open={invitationModalOpen}
        onOpenChange={setInvitationModalOpen}
        onSuccess={loadDocument}
      />
    </div>
  );
}
