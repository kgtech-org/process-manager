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
import { PinInputScreen } from './PinInputScreen';
import { PinSetupScreen } from './PinSetupScreen';
import { useLogin } from '@/hooks/useLogin';
import { loginRequestSchema, loginVerifySchema, LoginRequestData, LoginVerifyData } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const {
    step,
    email,
    isLoading,
    requestOtp,
    verifyOtp,
    goBackToEmail,
    hasPin,
    showPinInput,
    switchToOtp,
    switchToPin,
    resendOtp
  } = useLogin();
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
      const user = await verifyOtp(data);
      if (user.hasPin) {
        router.push('/macros'); // Redirect to macros page only if PIN is already set
      }
      // If !hasPin, step will update to 3 (handled in useLogin)
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
        {(step === 1 || (step === 2 && !showPinInput)) && (
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
        )}

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

          {step === 2 && showPinInput && (
            <PinInputScreen
              email={email}
              onSuccess={(data) => {
                router.push('/macros');
              }}
              onForgotPin={() => resendOtp()} // Trigger OTP send + switch to OTP screen
              onBack={() => resendOtp()} // Trigger OTP send + switch to OTP screen
            />
          )}

          {step === 2 && !showPinInput && (
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
                    onClick={resendOtp} // Use resendOtp with force flag
                    disabled={isLoading}
                  >
                    {t('login.resendOtp')}
                  </Button>
                </div>


                {hasPin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={switchToPin}
                    disabled={isLoading}
                  >
                    {t('login.usePin') || 'Use PIN'}
                  </Button>
                )}
              </form>
            </Form>
          )}

          {step === 3 && (
            <PinSetupScreen
              onSuccess={() => {
                router.push('/macros');
              }}
            />
          )}

          {step !== 3 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};