'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { OTPInput } from './OTPInput';
import { useLogin } from '@/hooks/useLogin';
import { loginRequestSchema, loginVerifySchema, LoginRequestData, LoginVerifyData } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { step, email, isLoading, requestOtp, verifyOtp, goBackToEmail } = useLogin();
  const [error, setError] = useState<string>('');
  const { t } = useTranslation('auth');

  // Step 1 Form - Email Input
  const step1Form = useForm<LoginRequestData>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '' },
  });

  // Step 2 Form - OTP Verification
  const step2Form = useForm<LoginVerifyData>({
    resolver: zodResolver(loginVerifySchema),
    defaultValues: { otp: '' },
  });

  const handleStep1Submit = async (data: LoginRequestData) => {
    try {
      setError('');
      await requestOtp(data);
    } catch (error: any) {
      setError(error.message || t('login.loginFailed'));
    }
  };

  const handleStep2Submit = async (data: LoginVerifyData) => {
    try {
      setError('');
      await verifyOtp(data);
      router.push('/macros'); // Redirect to macros page
    } catch (error: any) {
      setError(error.message || t('login.invalidOtp'));
    }
  };

  const handleGoBack = () => {
    setError('');
    goBackToEmail();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {step === 1 ? t('login.title') : t('login.otp')}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? t('login.subtitle')
              : t('login.otpSent', { email })
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <Form {...step1Form}>
              <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                <FormField
                  control={step1Form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('login.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('login.emailPlaceholder')}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? t('login.sendOtp') + '...' : t('login.sendOtp')}
                </Button>
              </form>
            </Form>
          )}

          {step === 2 && (
            <Form {...step2Form}>
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
                <FormField
                  control={step2Form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="text-center">
                      <FormLabel>{t('login.otp')}</FormLabel>
                      <FormControl>
                        <OTPInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? t('login.verify') + '...' : t('login.verify')}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleGoBack}
                    disabled={isLoading}
                  >
                    {t('login.resendOtp')}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          <div className="text-center text-sm text-gray-600">
            <p>
              {t('login.noAccount')}{' '}
              <button
                onClick={() => router.push('/register')}
                className="font-medium text-blue-600 hover:text-blue-500"
                disabled={isLoading}
              >
                {t('login.register')}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};