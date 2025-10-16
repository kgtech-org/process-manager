'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Signature, SignatureResource, SignatureType, Document, Contributor, UserResource } from '@/lib/resources';
import { CheckCircle2, XCircle, Clock, PenTool } from 'lucide-react';

interface SignaturePanelProps {
  documentId: string;
  document: Document;
  userTeam?: 'authors' | 'verifiers' | 'validators';
  onSignatureAdded?: () => void;
}

export function SignaturePanel({ documentId, document, userTeam, onSignatureAdded }: SignaturePanelProps) {
  const { t } = useTranslation('collaboration');
  const { toast } = useToast();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signatureData, setSignatureData] = useState({
    comments: '',
    signatureData: '',
  });
  const [signing, setSigning] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSignatures();
    loadCurrentUser();
  }, [documentId]);

  const loadCurrentUser = async () => {
    try {
      const user = await UserResource.getCurrentUser();
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const data = await SignatureResource.getDocumentSignatures(documentId);
      setSignatures(data);
    } catch (error: any) {
      toast({
        title: t('signatures.loadError'),
        description: error.response?.data?.message || t('signatures.loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignatureType = (): SignatureType | null => {
    if (!userTeam) return null;

    switch (userTeam) {
      case 'authors':
        return 'author';
      case 'verifiers':
        return 'verifier';
      case 'validators':
        return 'validator';
      default:
        return null;
    }
  };

  const hasUserSigned = (): boolean => {
    const signatureType = getSignatureType();
    if (!signatureType) return false;

    return signatures.some((sig) => sig.type === signatureType);
  };

  const handleSign = async () => {
    const signatureType = getSignatureType();
    if (!signatureType) {
      toast({
        title: t('signatures.error'),
        description: t('signatures.noPermission'),
        variant: 'destructive',
      });
      return;
    }

    if (!signatureData.signatureData.trim()) {
      toast({
        title: t('signatures.error'),
        description: t('signatures.signatureRequired'),
        variant: 'destructive',
      });
      return;
    }

    setSigning(true);

    try {
      await SignatureResource.add(documentId, {
        type: signatureType,
        signatureData: signatureData.signatureData,
        comments: signatureData.comments,
      });

      toast({
        title: t('signatures.success'),
        description: t('signatures.signatureAdded'),
      });

      setSignatureData({ comments: '', signatureData: '' });
      setSignDialogOpen(false);
      loadSignatures();
      onSignatureAdded?.();
    } catch (error: any) {
      toast({
        title: t('signatures.error'),
        description: error.response?.data?.message || t('signatures.signFailed'),
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  const getSignatureTypeBadge = (type: SignatureType) => {
    switch (type) {
      case 'author':
        return <Badge variant="default">{t('signatures.types.author')}</Badge>;
      case 'verifier':
        return <Badge variant="secondary">{t('signatures.types.verifier')}</Badge>;
      case 'validator':
        return <Badge className="bg-green-500">{t('signatures.types.validator')}</Badge>;
    }
  };

  const groupSignaturesByType = () => {
    const grouped: Record<SignatureType, Signature[]> = {
      author: [],
      verifier: [],
      validator: [],
    };

    signatures.forEach((sig) => {
      grouped[sig.type].push(sig);
    });

    return grouped;
  };

  const getSignatureForContributor = (contributor: Contributor): Signature | null => {
    return signatures.find(sig => sig.userId === contributor.userId) || null;
  };

  const getSignatureStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'joined':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderContributorWithSignature = (contributor: Contributor, type: SignatureType) => {
    const signature = getSignatureForContributor(contributor);
    const isCurrentUser = currentUserId === contributor.userId;
    const canSign = isCurrentUser && contributor.status === 'pending' && !signature;

    return (
      <div
        key={contributor.userId}
        className={`p-3 border rounded-lg space-y-2 ${isCurrentUser ? 'bg-blue-50/50 border-blue-200' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">
              {contributor.name}
              {isCurrentUser && (
                <Badge variant="outline" className="ml-2 text-xs">You</Badge>
              )}
            </p>
            {(contributor.title || contributor.department) && (
              <p className="text-sm text-muted-foreground">
                {[contributor.title, contributor.department].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canSign ? (
              <Button
                size="sm"
                onClick={() => setSignDialogOpen(true)}
                className="gap-2"
              >
                <PenTool className="h-4 w-4" />
                Sign
              </Button>
            ) : (
              <>
                {getSignatureStatusIcon(contributor.status)}
                <span className="text-sm capitalize">{contributor.status}</span>
              </>
            )}
          </div>
        </div>

        {signature && (
          <div className="pl-4 border-l-2 border-green-500 space-y-1">
            <p className="text-xs text-muted-foreground">
              Signed: {new Date(signature.signedAt).toLocaleString()}
            </p>
            {signature.comments && (
              <p className="text-sm text-gray-600">{signature.comments}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const groupedSignatures = groupSignaturesByType();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('signatures.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">{t('signatures.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('signatures.title')}</CardTitle>
              <CardDescription>{t('signatures.description')}</CardDescription>
            </div>
            {userTeam && !hasUserSigned() && (
              <Button onClick={() => setSignDialogOpen(true)}>
                {t('signatures.signDocument')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Authors */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Badge variant="secondary">{t('signatures.types.author')}</Badge>
              </h4>
              {document.contributors.authors.length === 0 ? (
                <p className="text-sm text-gray-500">{t('signatures.noContributors')}</p>
              ) : (
                <div className="space-y-2">
                  {document.contributors.authors.map((contributor) =>
                    renderContributorWithSignature(contributor, 'author')
                  )}
                </div>
              )}
            </div>

            {/* Verifiers */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Badge variant="secondary">{t('signatures.types.verifier')}</Badge>
              </h4>
              {document.contributors.verifiers.length === 0 ? (
                <p className="text-sm text-gray-500">{t('signatures.noContributors')}</p>
              ) : (
                <div className="space-y-2">
                  {document.contributors.verifiers.map((contributor) =>
                    renderContributorWithSignature(contributor, 'verifier')
                  )}
                </div>
              )}
            </div>

            {/* Validators */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Badge variant="secondary">{t('signatures.types.validator')}</Badge>
              </h4>
              {document.contributors.validators.length === 0 ? (
                <p className="text-sm text-gray-500">{t('signatures.noContributors')}</p>
              ) : (
                <div className="space-y-2">
                  {document.contributors.validators.map((contributor) =>
                    renderContributorWithSignature(contributor, 'validator')
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('signatures.signDocument')}</DialogTitle>
            <DialogDescription>{t('signatures.signDescription')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="signature">{t('signatures.signatureField')}</Label>
              <Textarea
                id="signature"
                placeholder={t('signatures.signaturePlaceholder')}
                value={signatureData.signatureData}
                onChange={(e) =>
                  setSignatureData({ ...signatureData, signatureData: e.target.value })
                }
                rows={3}
              />
              <p className="text-xs text-gray-500">{t('signatures.signatureHelp')}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comments">
                {t('signatures.comments')} ({t('signatures.optional')})
              </Label>
              <Textarea
                id="comments"
                placeholder={t('signatures.commentsPlaceholder')}
                value={signatureData.comments}
                onChange={(e) =>
                  setSignatureData({ ...signatureData, comments: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)} disabled={signing}>
              {t('signatures.cancel')}
            </Button>
            <Button onClick={handleSign} disabled={signing}>
              {signing ? t('signatures.signing') : t('signatures.sign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
