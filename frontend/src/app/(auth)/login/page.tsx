import React from 'react';
import { Metadata } from 'next';
import { GuestGuard } from '@/components/auth/GuestGuard';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In - Process Manager',
  description: 'Sign in to your Process Manager account using OTP verification.',
};

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginForm />
    </GuestGuard>
  );
}