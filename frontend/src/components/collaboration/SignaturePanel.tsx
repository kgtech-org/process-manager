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
import { Signature, SignatureResource, SignatureType } from '@/lib/resources';

interface SignaturePanelProps {
  documentId: string;
  userTeam?: 'authors' | 'verifiers' | 'validators';
  onSignatureAdded?: () => void;
}

export function SignaturePanel({ documentId, userTeam, onSignatureAdded }: SignaturePanelProps) {
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

  useEffect(() => {
    loadSignatures();
  }, [documentId]);

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
              <h4 className="font-medium mb-2">{t('signatures.types.author')}</h4>
              {groupedSignatures.author.length === 0 ? (
                <p className="text-sm text-gray-500">{t('signatures.noSignatures')}</p>
              ) : (
                <div className="space-y-2">
                  {groupedSignatures.author.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{sig.userName || sig.userEmail}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(sig.signedAt).toLocaleString()}
                        </p>
                        {sig.comments && (
                          <p className="text-sm mt-1 text-gray-600">{sig.comments}</p>
                        )}
                      </div>
                      {getSignatureTypeBadge(sig.type)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verifiers */}
            <div>
              <h4 className="font-medium mb-2">{t('signatures.types.verifier')}</h4>
              {groupedSignatures.verifier.length === 0 ? (
                <p className="text-sm text-gray-500">{t('signatures.noSignatures')}</p>
              ) : (
                <div className="space-y-2">
                  {groupedSignatures.verifier.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{sig.userName || sig.userEmail}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(sig.signedAt).toLocaleString()}
                        </p>
                        {sig.comments && (
                          <p className="text-sm mt-1 text-gray-600">{sig.comments}</p>
                        )}
                      </div>
                      {getSignatureTypeBadge(sig.type)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validators */}
            <div>
              <h4 className="font-medium mb-2">{t('signatures.types.validator')}</h4>
              {groupedSignatures.validator.length === 0 ? (
                <p className="text-sm text-gray-500">{t('signatures.noSignatures')}</p>
              ) : (
                <div className="space-y-2">
                  {groupedSignatures.validator.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{sig.userName || sig.userEmail}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(sig.signedAt).toLocaleString()}
                        </p>
                        {sig.comments && (
                          <p className="text-sm mt-1 text-gray-600">{sig.comments}</p>
                        )}
                      </div>
                      {getSignatureTypeBadge(sig.type)}
                    </div>
                  ))}
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
