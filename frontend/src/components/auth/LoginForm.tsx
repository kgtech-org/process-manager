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
import { PinInput } from '@/components/ui/pin-input';
import { useLogin } from '@/hooks/useLogin';
import { useAuth } from '@/contexts/auth.context';
import { authService } from '@/lib/auth';
import { loginRequestSchema, loginVerifySchema, LoginRequestData, LoginVerifyData } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';

type LoginStep = 'email' | 'pin' | 'otp' | 'pin-setup';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { loginWithPin } = useAuth();
  const { step: otpStep, email: otpEmail, isLoading: otpLoading, requestOtp, verifyOtp, goBackToEmail } = useLogin();
  const [currentStep, setCurrentStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [temporaryToken, setTemporaryToken] = useState<string>('');
  const { t } = useTranslation('auth');

  // Step 1 Form - Email Input
  const emailForm = useForm<LoginRequestData>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '' },
  });

  // Step 2 Form - OTP Verification
  const otpForm = useForm<LoginVerifyData>({
    resolver: zodResolver(loginVerifySchema),
    defaultValues: { otp: '' },
  });

  const handleEmailSubmit = async (data: LoginRequestData) => {
    try {
      setError('');
      setIsLoading(true);
      setEmail(data.email);

      // Check if user has PIN set up
      const pinStatus = await authService.checkPinStatus(data.email);

      if (pinStatus.hasPin && !pinStatus.isLocked) {
        // User has PIN - show PIN input
        setHasPin(true);
        setCurrentStep('pin');
      } else {
        // No PIN or locked - send OTP
        const response = await authService.requestLoginOtp(data);
        setTemporaryToken(response.temporaryToken);
        setCurrentStep('otp');
      }
    } catch (error: any) {
      setError(error.message || t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinComplete = async (pinValue: string) => {
    try {
      setError('');
      setIsLoading(true);

      // Verify PIN and login
      await loginWithPin(email, pinValue);
      router.push('/macros'); // Redirect to macros page
    } catch (error: any) {
      setError(error.message || 'Invalid PIN');
      setPin(''); // Clear PIN on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (data: LoginVerifyData) => {
    try {
      setError('');
      setIsLoading(true);

      await verifyOtp(data);

      // After first OTP login, check if user needs to set up PIN
      if (!hasPin) {
        setCurrentStep('pin-setup');
      } else {
        router.push('/macros');
      }
    } catch (error: any) {
      setError(error.message || t('login.invalidOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPin = async () => {
    try {
      setError('');
      setIsLoading(true);

      // Request OTP for PIN reset/login
      const response = await authService.requestPinReset(email);
      setTemporaryToken(response.temporaryToken);
      setCurrentStep('otp');
    } catch (error: any) {
      setError(error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setError('');
    setPin('');
    setCurrentStep('email');
    setHasPin(false);
    emailForm.reset();
    otpForm.reset();
  };

  const getCardTitle = () => {
    switch (currentStep) {
      case 'email':
        return t('login.title');
      case 'pin':
        return 'Enter Your PIN';
      case 'otp':
        return t('login.otp');
      case 'pin-setup':
        return 'Set Up Your PIN';
      default:
        return t('login.title');
    }
  };

  const getCardDescription = () => {
    switch (currentStep) {
      case 'email':
        return t('login.subtitle');
      case 'pin':
        return `Enter your 6-digit PIN for ${email}`;
      case 'otp':
        return t('login.otpSent', { email });
      case 'pin-setup':
        return 'Set up a 6-digit PIN for faster login';
      default:
        return t('login.subtitle');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{getCardTitle()}</CardTitle>
          <CardDescription>{getCardDescription()}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {/* Step 1: Email Input */}
          {currentStep === 'email' && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Checking...' : 'Continue'}
                </Button>
              </form>
            </Form>
          )}

          {/* Step 2a: PIN Input */}
          {currentStep === 'pin' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <PinInput
                  value={pin}
                  onChange={setPin}
                  onComplete={handlePinComplete}
                  error={error}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleForgotPin}
                  disabled={isLoading}
                >
                  Forgot PIN?
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoBack}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Step 2b: OTP Input */}
          {currentStep === 'otp' && (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('login.verify') + '...' : t('login.verify')}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoBack}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {/* Step 3: PIN Setup (after first OTP login) */}
          {currentStep === 'pin-setup' && (
            <PinSetupForm onComplete={() => router.push('/macros')} onSkip={() => router.push('/macros')} />
          )}

          {currentStep === 'email' && (
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

// PIN Setup Component (shown after first OTP login)
interface PinSetupFormProps {
  onComplete: () => void;
  onSkip: () => void;
}

const PinSetupForm: React.FC<PinSetupFormProps> = ({ onComplete, onSkip }) => {
  const { setUserPin } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'pin' | 'confirm'>('pin');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePinComplete = (pinValue: string) => {
    setPin(pinValue);
    setStep('confirm');
    setError('');
  };

  const handleConfirmComplete = async (confirmValue: string) => {
    if (confirmValue !== pin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await setUserPin(pin, confirmValue);
      onComplete();
    } catch (error: any) {
      setError(error.message || 'Failed to set PIN');
      setConfirmPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('pin');
      setConfirmPin('');
      setError('');
    }
  };

  return (
    <div className="space-y-6">
      {step === 'pin' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Choose a 6-digit PIN that you&apos;ll remember
          </p>
          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={handlePinComplete}
            error={error}
            disabled={isLoading}
            autoFocus
            allowMaskToggle
          />
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Confirm your PIN
          </p>
          <PinInput
            value={confirmPin}
            onChange={setConfirmPin}
            onComplete={handleConfirmComplete}
            error={error}
            disabled={isLoading}
            autoFocus
            allowMaskToggle
          />
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={isLoading}
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onSkip}
        disabled={isLoading}
        className="w-full"
      >
        Skip for now
      </Button>
    </div>
  );
};