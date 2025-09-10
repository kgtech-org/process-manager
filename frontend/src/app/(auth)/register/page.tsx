import React from 'react';
import { Metadata } from 'next';
import { GuestGuard } from '@/components/auth/GuestGuard';
import { RegisterWizard } from '@/components/auth/RegisterWizard';

export const metadata: Metadata = {
  title: 'Create Account - Process Manager',
  description: 'Create a new Process Manager account with 3-step registration process.',
};

export default function RegisterPage() {
  return (
    <GuestGuard>
      <RegisterWizard />
    </GuestGuard>
  );
}