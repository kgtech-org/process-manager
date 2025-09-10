import React from 'react';
import { Metadata } from 'next';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProfileForm } from '@/components/auth/ProfileForm';

export const metadata: Metadata = {
  title: 'Profile - Process Manager',
  description: 'Manage your profile information and account settings.',
};

export default function ProfilePage() {
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences.</p>
        </div>
        
        <ProfileForm />
      </div>
    </AuthGuard>
  );
}