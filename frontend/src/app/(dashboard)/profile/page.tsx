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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-gray-600">{t('profile.subtitle', { defaultValue: 'Manage your account information and preferences.' })}</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <ProfileForm />

          {/* Signature Management Section */}
          <div className="mt-8">
            <SignatureManager />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}