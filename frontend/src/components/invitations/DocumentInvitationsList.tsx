'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitationResource, Invitation } from '@/lib/resources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RotateCw, Trash2, Mail } from 'lucide-react';
import { format } from 'date-fns';
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

interface DocumentInvitationsListProps {
  documentId: string;
}

export function DocumentInvitationsList({ documentId }: DocumentInvitationsListProps) {
  const { t } = useTranslation('invitations');
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [documentId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const result = await InvitationResource.list({ documentId });
      setInvitations(result.data);
    } catch (error: any) {
      console.error('Failed to load invitations:', error);
      toast({
        title: t('list.loadError'),
        description: error.response?.data?.message || t('list.actionFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitation: Invitation) => {
    try {
      setActionLoading(invitation.id);
      await InvitationResource.resend(invitation.id);

      toast({
        title: t('list.resendSuccess'),
        description: t('list.resendSuccessMessage', { email: invitation.invitedEmail }),
      });

      loadInvitations();
    } catch (error: any) {
      toast({
        title: t('list.resendError'),
        description: error.response?.data?.message || t('list.actionFailed'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedInvitation) return;

    try {
      setActionLoading(selectedInvitation.id);
      await InvitationResource.cancel(selectedInvitation.id);

      toast({
        title: t('list.cancelSuccess'),
        description: t('list.cancelSuccessMessage'),
      });

      loadInvitations();
      setCancelDialogOpen(false);
      setSelectedInvitation(null);
    } catch (error: any) {
      toast({
        title: t('list.cancelError'),
        description: error.response?.data?.message || t('list.actionFailed'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">{t('list.statuses.pending')}</Badge>;
      case 'accepted':
        return <Badge variant="default">{t('list.statuses.accepted')}</Badge>;
      case 'declined':
        return <Badge variant="destructive">{t('list.statuses.declined')}</Badge>;
      case 'expired':
        return <Badge variant="outline">{t('list.statuses.expired')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTeamBadge = (team: string) => {
    return <Badge variant="outline">{t(`list.teams.${team}`)}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
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
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t('list.noInvitations')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          <CardDescription>{t('list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.columns.email')}</TableHead>
                <TableHead>{t('list.columns.team')}</TableHead>
                <TableHead>{t('list.columns.status')}</TableHead>
                <TableHead>{t('list.columns.sentDate')}</TableHead>
                <TableHead>{t('list.columns.expiresAt')}</TableHead>
                <TableHead className="text-right">{t('list.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.invitedEmail}</TableCell>
                  <TableCell>{getTeamBadge(invitation.team)}</TableCell>
                  <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                  <TableCell>{format(new Date(invitation.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(invitation.expiresAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    {invitation.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(invitation)}
                          disabled={actionLoading === invitation.id}
                        >
                          <RotateCw className="h-4 w-4 mr-1" />
                          {t('list.resend')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelClick(invitation)}
                          disabled={actionLoading === invitation.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('list.cancel')}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('list.cancelConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('list.cancelConfirmMessage', { email: selectedInvitation?.invitedEmail })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('list.cancelAction')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              {t('list.confirmCancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
