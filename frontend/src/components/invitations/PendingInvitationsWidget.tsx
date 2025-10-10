'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitationResource, Invitation } from '@/lib/resources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Mail, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

export function PendingInvitationsWidget() {
  const { t } = useTranslation('invitations');
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const result = await InvitationResource.list({ status: 'pending', limit: 5 });
      setInvitations(result.data);
    } catch (error: any) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    try {
      setActionLoading(invitation.id);
      await InvitationResource.accept(invitation.id);

      toast({
        title: t('widget.acceptSuccess'),
        description: t('widget.acceptSuccessMessage', { document: invitation.documentTitle }),
      });

      // Remove from list
      setInvitations(invitations.filter((inv) => inv.id !== invitation.id));
    } catch (error: any) {
      toast({
        title: t('widget.acceptError'),
        description: error.response?.data?.message || t('widget.actionFailed'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setDeclineDialogOpen(true);
  };

  const handleDeclineConfirm = async () => {
    if (!selectedInvitation) return;

    try {
      setActionLoading(selectedInvitation.id);
      await InvitationResource.decline(selectedInvitation.id);

      toast({
        title: t('widget.declineSuccess'),
        description: t('widget.declineSuccessMessage'),
      });

      // Remove from list
      setInvitations(invitations.filter((inv) => inv.id !== selectedInvitation.id));
      setDeclineDialogOpen(false);
      setSelectedInvitation(null);
    } catch (error: any) {
      toast({
        title: t('widget.declineError'),
        description: error.response?.data?.message || t('widget.actionFailed'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    return differenceInDays(new Date(expiresAt), new Date());
  };

  const getTeamBadgeVariant = (team: string) => {
    switch (team) {
      case 'authors':
        return 'default';
      case 'verifiers':
        return 'secondary';
      case 'validators':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('widget.title')}</CardTitle>
          <CardDescription>{t('widget.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('widget.title')}</CardTitle>
          <CardDescription>{t('widget.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t('widget.noInvitations')}</p>
          </div>
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
              <CardTitle>{t('widget.title')}</CardTitle>
              <CardDescription>{t('widget.description')}</CardDescription>
            </div>
            <Badge variant="secondary">{invitations.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invitations.map((invitation) => {
              const daysUntilExpiry = getDaysUntilExpiry(invitation.expiresAt);
              const isExpiringSoon = daysUntilExpiry <= 2;

              return (
                <div
                  key={invitation.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/documents/${invitation.documentId}`}
                        className="font-medium hover:underline"
                      >
                        {invitation.documentTitle || t('widget.untitledDocument')}
                      </Link>
                      <Badge variant={getTeamBadgeVariant(invitation.team)}>
                        {t(`widget.teams.${invitation.team}`)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {t('widget.invitedBy', { name: invitation.invitedByName })}
                    </p>

                    {invitation.message && (
                      <p className="text-sm italic text-muted-foreground">
                        &quot;{invitation.message}&quot;
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                      </div>
                      {isExpiringSoon && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {t('widget.expiresIn', { days: daysUntilExpiry })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAccept(invitation)}
                      disabled={actionLoading === invitation.id}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {t('widget.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineClick(invitation)}
                      disabled={actionLoading === invitation.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t('widget.decline')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('widget.declineConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('widget.declineConfirmMessage', {
                document: selectedInvitation?.documentTitle,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('widget.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeclineConfirm}>
              {t('widget.confirmDecline')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
