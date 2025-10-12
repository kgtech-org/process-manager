'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { SignatureManager } from '@/components/signatures';
import { useTranslation } from '@/lib/i18n';

export default function ProfilePage() {
  const { t } = useTranslation('auth');

  return (
    <AuthGuard>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle', { defaultValue: 'Manage your account information and preferences.' })}</p>
        </div>

        <ProfileForm />
      </div>
    </AuthGuard>
  );
}