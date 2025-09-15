'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProfileForm } from '@/components/auth/ProfileForm';
import { TokenStatus } from '@/components/auth/TokenStatus';
import { useTranslation } from '@/lib/i18n';

export default function ProfilePage() {
  const { t } = useTranslation('auth');

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-gray-600">{t('profile.subtitle', { defaultValue: 'Manage your account information and preferences.' })}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfileForm />
          </div>
          <div className="lg:col-span-1">
            <TokenStatus showDetails={true} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}