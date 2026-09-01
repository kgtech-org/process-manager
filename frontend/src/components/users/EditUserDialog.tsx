'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DepartmentSelector } from '@/components/auth/DepartmentSelector';
import { JobPositionSelector } from '@/components/auth/JobPositionSelector';
import { UserResource, type User } from '@/lib/resources';
import type { Department, JobPosition } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';

interface EditUserDialogProps {
  user: User | null;
  departments: Department[];
  jobPositions: JobPosition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (user: User) => void;
}

type Draft = {
  firstName: string;
  lastName: string;
  phone: string;
  departmentId: string;
  jobPositionId: string;
  role: User['role'];
  status: User['status'];
};

const draftFromUser = (user: User): Draft => ({
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  phone: user.phone ?? '',
  departmentId: user.departmentId ?? '',
  jobPositionId: user.jobPositionId ?? '',
  role: user.role,
  status: user.status,
});

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  departments,
  jobPositions,
  open,
  onOpenChange,
  onUpdated,
}) => {
  const { t } = useTranslation('users');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Repart de l'utilisateur courant à chaque ouverture, pour ne pas garder
  // les saisies d'une édition précédente.
  useEffect(() => {
    if (open && user) {
      setDraft(draftFromUser(user));
      setError('');
    }
  }, [open, user]);

  if (!user || !draft) return null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  // Un utilisateur en attente relève du parcours approuver/rejeter de la liste,
  // pas d'un simple changement de statut.
  const statusLocked = user.status === 'pending';

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      let updated: User = user;

      const identityChanged =
        draft.firstName !== (user.firstName ?? '') ||
        draft.lastName !== (user.lastName ?? '') ||
        draft.phone !== (user.phone ?? '') ||
        draft.departmentId !== (user.departmentId ?? '') ||
        draft.jobPositionId !== (user.jobPositionId ?? '');

      if (identityChanged) {
        updated = await UserResource.update(user.id, {
          firstName: draft.firstName,
          lastName: draft.lastName,
          phone: draft.phone || undefined,
          departmentId: draft.departmentId || undefined,
          jobPositionId: draft.jobPositionId || undefined,
        });
      }

      // Rôle et statut ont leurs propres endpoints : on ne les appelle que s'ils bougent.
      if (draft.role !== user.role) {
        updated = await UserResource.updateRole(user.id, draft.role);
      }

      if (!statusLocked && draft.status !== user.status) {
        updated =
          draft.status === 'active'
            ? await UserResource.activate(user.id)
            : await UserResource.deactivate(user.id);
      }

      // La réponse d'un endpoint partiel peut ne pas refléter les autres champs
      // que l'on vient d'envoyer : on recompose l'utilisateur affiché.
      onUpdated({
        ...user,
        ...updated,
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone || undefined,
        departmentId: draft.departmentId || undefined,
        jobPositionId: draft.jobPositionId || undefined,
        role: draft.role,
        status: statusLocked ? user.status : draft.status,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || t('messages.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editUser')}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">{t('fields.firstName')}</Label>
              <Input
                id="firstName"
                value={draft.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder={t('placeholders.enterFirstName')}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t('fields.lastName')}</Label>
              <Input
                id="lastName"
                value={draft.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder={t('placeholders.enterLastName')}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">{t('fields.phone')}</Label>
            <Input
              id="phone"
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder={t('placeholders.enterPhone')}
              disabled={saving}
            />
          </div>

          <div>
            <Label>{t('fields.department')}</Label>
            <DepartmentSelector
              departments={departments}
              value={draft.departmentId}
              onValueChange={(value) => {
                set('departmentId', value);
                // Le poste dépend du département : un changement invalide la sélection.
                set('jobPositionId', '');
              }}
              disabled={saving}
              placeholder={t('placeholders.selectDepartment')}
            />
          </div>

          <div>
            <Label>{t('fields.jobPosition')}</Label>
            <JobPositionSelector
              jobPositions={jobPositions}
              value={draft.jobPositionId}
              onValueChange={(value) => set('jobPositionId', value)}
              disabled={saving}
              placeholder={t('placeholders.selectJobPosition')}
              departmentId={draft.departmentId || undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('fields.role')}</Label>
              <Select
                value={draft.role}
                onValueChange={(value) => set('role', value as User['role'])}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('roles.user')}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                  <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('fields.status')}</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => set('status', value as User['status'])}
                disabled={saving || statusLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
                </SelectContent>
              </Select>
              {statusLocked && (
                <p className="mt-1 text-xs text-gray-500">{t('edit.statusLockedHint')}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('edit.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('edit.saving') : t('edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
