'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { InvitationResource, CreateInvitationRequest } from '@/lib/resources';

interface InvitationModalProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InvitationModal({
  documentId,
  open,
  onOpenChange,
  onSuccess,
}: InvitationModalProps) {
  const { t } = useTranslation('collaboration');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInvitationRequest>({
    documentId,
    invitedEmail: '',
    type: 'collaborator',
    team: 'authors',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateInvitationRequest, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateInvitationRequest, string>> = {};

    if (!formData.invitedEmail.trim()) {
      newErrors.invitedEmail = t('invitation.errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.invitedEmail)) {
      newErrors.invitedEmail = t('invitation.errors.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await InvitationResource.send(formData);

      toast({
        title: t('invitation.success'),
        description: t('invitation.sentMessage', { email: formData.invitedEmail }),
      });

      // Reset form
      setFormData({
        documentId,
        invitedEmail: '',
        type: 'collaborator',
        team: 'authors',
        message: '',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('invitation.error'),
        description: error.response?.data?.message || t('invitation.sendFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('invitation.title')}</DialogTitle>
          <DialogDescription>{t('invitation.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">{t('invitation.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.invitedEmail}
                onChange={(e) =>
                  setFormData({ ...formData, invitedEmail: e.target.value })
                }
                className={errors.invitedEmail ? 'border-red-500' : ''}
              />
              {errors.invitedEmail && (
                <p className="text-sm text-red-500">{errors.invitedEmail}</p>
              )}
            </div>

            {/* Team/Role */}
            <div className="grid gap-2">
              <Label htmlFor="team">{t('invitation.team')}</Label>
              <Select
                value={formData.team}
                onValueChange={(value: any) => setFormData({ ...formData, team: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authors">{t('invitation.teams.authors')}</SelectItem>
                  <SelectItem value="verifiers">{t('invitation.teams.verifiers')}</SelectItem>
                  <SelectItem value="validators">{t('invitation.teams.validators')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">{t('invitation.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborator">
                    {t('invitation.types.collaborator')}
                  </SelectItem>
                  <SelectItem value="reviewer">{t('invitation.types.reviewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="grid gap-2">
              <Label htmlFor="message">{t('invitation.message')} ({t('invitation.optional')})</Label>
              <Textarea
                id="message"
                placeholder={t('invitation.messagePlaceholder')}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('invitation.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('invitation.sending') : t('invitation.send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
