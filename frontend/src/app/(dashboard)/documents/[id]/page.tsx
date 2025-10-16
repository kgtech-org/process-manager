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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  ChevronDown,
  Search,
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Load active tab from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`document-${documentId}-activeTab`) || 'process-flow';
    }
    return 'process-flow';
  });
  const [documentSwitcherOpen, setDocumentSwitcherOpen] = useState(false);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Persist active tab to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`document-${documentId}-activeTab`, activeTab);
    }
  }, [activeTab, documentId]);

  // Load documents for switcher when modal opens
  useEffect(() => {
    if (documentSwitcherOpen && allDocuments.length === 0) {
      loadAllDocuments();
    }
  }, [documentSwitcherOpen]);

  const loadAllDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const docs = await DocumentResource.getAll({ limit: 100 });
      setAllDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      setVersionsLoading(true);
      const versionsList = await DocumentResource.getVersions(documentId);
      setVersions(versionsList);
    } catch (error) {
      console.error('Failed to load versions:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load versions',
        description: 'An error occurred',
      });
    } finally {
      setVersionsLoading(false);
    }
  };

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
    // Don't reload the entire document - just update local state
    setDocument((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        annexes: prev.annexes.map((annex) =>
          annex.id === annexId ? { ...annex, ...updates } : annex
        ),
      };
    });
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
          <Dialog open={documentSwitcherOpen} onOpenChange={setDocumentSwitcherOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-muted p-0">
                <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[600px]">
              <DialogHeader>
                <DialogTitle>Switch Document</DialogTitle>
                <DialogDescription>
                  Select a document to navigate to
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Document list */}
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {allDocuments
                      .filter(doc =>
                        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        doc.reference.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((doc) => (
                        <Button
                          key={doc.id}
                          variant={doc.id === documentId ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => {
                            router.push(`/documents/${doc.id}`);
                            setDocumentSwitcherOpen(false);
                          }}
                        >
                          <div className="flex-1 text-left">
                            <div className="font-semibold">{doc.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {doc.reference} • v{doc.version}
                            </div>
                          </div>
                          <DocumentStatusBadge status={doc.status} />
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Document Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(document.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">v{document.version}</span>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              {document.annexes?.length || 0} annexes
            </div>
            <div className="text-sm text-muted-foreground">
              {(document.metadata?.objectives?.length || 0) +
                (document.metadata?.implicatedActors?.length || 0) +
                (document.metadata?.managementRules?.length || 0) +
                (document.metadata?.terminology?.length || 0)}{' '}
              metadata items
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Versions Dialog (hidden by default) */}
      <Dialog open={versionsModalOpen} onOpenChange={setVersionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Document Versions</DialogTitle>
            <DialogDescription>
              View all versions of this document
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {versions.map((version) => {
                const versionData = version.data || version;
                return (
                  <Card key={version.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">v{version.version}</Badge>
                            <DocumentStatusBadge status={versionData.status} />
                            {version.documentId === documentId && (
                              <Badge variant="outline">Current</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{versionData.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {versionData.reference}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(version.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {version.changeNote && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {version.changeNote}
                            </p>
                          )}
                        </div>
                        {version.documentId !== documentId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              router.push(`/documents/${version.documentId}`);
                              setVersionsModalOpen(false);
                            }}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {versions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No version history available
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Document Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
