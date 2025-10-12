'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentResource, type Document } from '@/lib/resources';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { InvitationModal, PermissionManager, SignaturePanel } from '@/components/collaboration';
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

      {document.metadata?.objectives && document.metadata.objectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {document.metadata.objectives.map((objective, index) => (
                <li key={index} className="text-sm">
                  {objective}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Collaboration Section */}
      <Tabs defaultValue="signatures" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signatures">Signatures & Contributors</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="signatures">
          <SignaturePanel
            documentId={documentId}
            document={document}
            onSignatureAdded={loadDocument}
          />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionManager documentId={documentId} />
        </TabsContent>
        <TabsContent value="invitations">
          <DocumentInvitationsList documentId={documentId} />
        </TabsContent>
      </Tabs>

      {document.processGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Process Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.processGroups.map((group, groupIndex) => (
              <div key={group.id}>
                <h3 className="font-semibold mb-3">
                  {group.order}. {group.title}
                </h3>
                <div className="space-y-2 pl-4">
                  {group.processSteps.map((step) => (
                    <div key={step.id} className="p-3 rounded-lg border">
                      <p className="font-medium">
                        {step.order}. {step.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Responsible: {step.responsible}
                      </p>
                    </div>
                  ))}
                </div>
                {groupIndex < document.processGroups.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
