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
import { Signature, SignatureResource, SignatureType, Document, Contributor, UserSignatureResource, UserSignature } from '@/lib/resources';
import { authService } from '@/lib/auth';
import { CheckCircle2, XCircle, Clock, PenTool, AlertCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface SignaturePanelProps {
  documentId: string;
  document: Document;
  userTeam?: 'authors' | 'verifiers' | 'validators';
  onSignatureAdded?: () => void;
  onInviteClick?: () => void;
}

export function SignaturePanel({ documentId, document, userTeam, onSignatureAdded, onInviteClick }: SignaturePanelProps) {
  const { t } = useTranslation('collaboration');
  const { toast } = useToast();
  const router = useRouter();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signatureData, setSignatureData] = useState({
    comments: '',
    signatureData: '',
  });
  const [signing, setSigning] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userSignature, setUserSignature] = useState<UserSignature | null>(null);
  const [showNoSignatureDialog, setShowNoSignatureDialog] = useState(false);

  useEffect(() => {
    loadSignatures();
    loadCurrentUser();
    loadUserSignature();
  }, [documentId]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadUserSignature = async () => {
    try {
      const signature = await UserSignatureResource.get();
      setUserSignature(signature);
    } catch (error) {
      console.error('Failed to load user signature:', error);
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
    if (!currentUserId) return false;
    return signatures.some((sig) => sig.userId === currentUserId);
  };

  const handleSignClick = () => {
    // Check if user has a signature first
    if (!userSignature) {
      setShowNoSignatureDialog(true);
      return;
    }

    // Pre-fill with user's signature
    setSignatureData({
      comments: '',
      signatureData: userSignature.data,
    });
    setSignDialogOpen(true);
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

    // Validate that we have signature data (should be pre-filled from userSignature)
    if (!userSignature || !signatureData.signatureData) {
      toast({
        title: t('signatures.error'),
        description: 'Signature data is missing',
        variant: 'destructive',
      });
      return;
    }

    setSigning(true);

    try {
      const result = await SignatureResource.add(documentId, {
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

  const renderSignature = (signature: Signature) => {
    // Parse signature data to determine type
    const isImageOrDrawn = signature.signatureData.startsWith('data:image/');

    return (
      <div className="border rounded-lg p-3 bg-gray-50 flex items-center justify-center min-h-[80px]">
        {isImageOrDrawn ? (
          <img
            src={signature.signatureData}
            alt="Signature"
            className="max-h-[60px] max-w-full object-contain"
          />
        ) : (
          <p className="text-xl" style={{ fontFamily: 'cursive' }}>
            {signature.signatureData}
          </p>
        )}
      </div>
    );
  };

  const renderContributorWithSignature = (contributor: Contributor, type: SignatureType) => {
    const signature = getSignatureForContributor(contributor);
    const isCurrentUser = currentUserId === contributor.userId;
    const canSign = isCurrentUser && contributor.status === 'pending' && !signature;
    const hasSigned = signature !== null;

    return (
      <div
        key={contributor.userId}
        className={`p-3 border rounded-lg ${isCurrentUser ? 'bg-blue-50/50 border-blue-200' : ''}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{contributor.name}</p>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>
            {(contributor.title || contributor.department) && (
              <p className="text-sm text-muted-foreground">
                {[contributor.title, contributor.department].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>

          {/* Signature or Action */}
          <div className="flex items-center gap-3">
            {signature ? (
              <div className="flex items-center gap-3">
                {/* Inline signature preview */}
                <div className="border rounded p-2 bg-gray-50 flex items-center justify-center h-12 w-32">
                  {signature.signatureData.startsWith('data:image/') ? (
                    <img
                      src={signature.signatureData}
                      alt="Signature"
                      className="max-h-10 max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm" style={{ fontFamily: 'cursive' }}>
                      {signature.signatureData}
                    </p>
                  )}
                </div>
                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>{new Date(signature.signedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ) : canSign ? (
              <Button
                size="sm"
                onClick={handleSignClick}
                className="gap-2"
              >
                <PenTool className="h-4 w-4" />
                Sign
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {getSignatureStatusIcon(contributor.status)}
                <span className="text-sm capitalize">{contributor.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Comments on separate line if exists */}
        {signature && signature.comments && (
          <div className="mt-2 pl-4 border-l-2 border-blue-400 text-sm text-gray-700">
            <span className="text-xs text-muted-foreground">Comment: </span>
            {signature.comments}
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
            <div className="flex gap-2">
              {onInviteClick && (
                <Button variant="outline" onClick={onInviteClick}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('invitation.title')}
                </Button>
              )}
              {userTeam && !hasUserSigned() && (
                <Button onClick={handleSignClick}>
                  <PenTool className="h-4 w-4 mr-2" />
                  {t('signatures.signDocument')}
                </Button>
              )}
            </div>
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

              {/* Display signature preview */}
              {userSignature && (
                <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[120px]">
                  {userSignature.type === 'image' || userSignature.type === 'drawn' ? (
                    <img
                      src={userSignature.data}
                      alt="Your signature"
                      className="max-h-[100px] max-w-full object-contain"
                    />
                  ) : (
                    <p
                      className="text-2xl"
                      style={{ fontFamily: userSignature.font || 'cursive' }}
                    >
                      {userSignature.data}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500">
                {userSignature
                  ? 'This signature will be applied to the document'
                  : t('signatures.signatureHelp')
                }
              </p>
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

      {/* No Signature Dialog */}
      <Dialog open={showNoSignatureDialog} onOpenChange={setShowNoSignatureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Signature Required
            </DialogTitle>
            <DialogDescription>
              You need to create your signature before you can sign documents.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Signature Found</AlertTitle>
            <AlertDescription>
              Please go to your profile page to create your digital signature.
              You can upload an image, draw your signature, or type it.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoSignatureDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowNoSignatureDialog(false);
              router.push('/profile');
            }}>
              Go to Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
