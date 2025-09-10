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

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { step, email, isLoading, requestOtp, verifyOtp, goBackToEmail } = useLogin();
  const [error, setError] = useState<string>('');

  // Step 1 Form - Email Input
  const emailForm = useForm<LoginRequestData>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  // Step 2 Form - OTP Verification
  const otpForm = useForm<LoginVerifyData>({
    resolver: zodResolver(loginVerifySchema),
    defaultValues: {
      otp: '',
    },
  });

  const handleEmailSubmit = async (data: LoginRequestData) => {
    try {
      setError('');
      await requestOtp(data);
    } catch (error: any) {
      setError(error.message || 'Failed to send OTP');
    }
  };

  const handleOtpSubmit = async (data: LoginVerifyData) => {
    try {
      setError('');
      await verifyOtp(data);
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      setError(error.message || 'Invalid OTP');
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
            {step === 1 ? 'Sign In' : 'Verify OTP'}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? 'Enter your email address to receive an OTP'
              : `We sent a 6-digit code to ${email}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {step === 1 ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your.email@togocom.tg"
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
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="text-center">
                      <FormLabel>Verification Code</FormLabel>
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
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleGoBack}
                    disabled={isLoading}
                  >
                    Back to Email
                  </Button>
                </div>
              </form>
            </Form>
          )}

          <div className="text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="font-medium text-blue-600 hover:text-blue-500"
                disabled={isLoading}
              >
                Sign up here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};