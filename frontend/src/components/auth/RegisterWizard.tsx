'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { OTPInput } from './OTPInput';
import { DepartmentSelector } from './DepartmentSelector';
import { JobPositionSelector } from './JobPositionSelector';
import { useRegistration } from '@/hooks/useRegistration';
import {
  registrationStep1Schema,
  registrationStep2Schema,
  registrationStep3Schema,
  RegistrationStep1Data,
  RegistrationStep2Data,
  RegistrationStep3Data,
} from '@/lib/validation';

export const RegisterWizard: React.FC = () => {
  const router = useRouter();
  const {
    step,
    email,
    isLoading,
    departments,
    jobPositions,
    isComplete,
    userName,
    registerStep1,
    registerStep2,
    registerStep3,
    loadDepartments,
    loadJobPositions,
    goToPreviousStep,
  } = useRegistration();

  const [error, setError] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  // Step 1 Form - Email
  const step1Form = useForm<RegistrationStep1Data>({
    resolver: zodResolver(registrationStep1Schema),
    defaultValues: { email: '' },
  });

  // Step 2 Form - OTP
  const step2Form = useForm<RegistrationStep2Data>({
    resolver: zodResolver(registrationStep2Schema),
    defaultValues: { otp: '' },
  });

  // Step 3 Form - Profile
  const step3Form = useForm<RegistrationStep3Data>({
    resolver: zodResolver(registrationStep3Schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      departmentId: '',
      jobPositionId: '',
    },
  });

  // Load departments when reaching step 3
  useEffect(() => {
    if (step === 3) {
      loadDepartments().catch((error) => {
        setError('Failed to load departments');
      });
    }
  }, [step, loadDepartments]);

  // Load job positions when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      loadJobPositions(selectedDepartmentId).catch((error) => {
        console.error('Failed to load job positions:', error);
      });
    }
  }, [selectedDepartmentId, loadJobPositions]);

  const handleStep1Submit = async (data: RegistrationStep1Data) => {
    try {
      setError('');
      await registerStep1(data);
    } catch (error: any) {
      setError(error.message || 'Failed to send registration email');
    }
  };

  const handleStep2Submit = async (data: RegistrationStep2Data) => {
    try {
      setError('');
      await registerStep2(data);
    } catch (error: any) {
      setError(error.message || 'Invalid OTP');
    }
  };

  const handleStep3Submit = async (data: RegistrationStep3Data) => {
    try {
      setError('');
      await registerStep3(data);
      // Success step is now handled by the hook (step 4)
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    }
  };

  const handleGoBack = () => {
    setError('');
    goToPreviousStep();
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    step3Form.setValue('departmentId', departmentId);
    step3Form.setValue('jobPositionId', ''); // Reset job position
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Create Account';
      case 2: return 'Verify Email';
      case 3: return 'Complete Profile';
      case 4: return 'Registration Successful!';
      default: return 'Registration';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Enter your email address to get started';
      case 2: return `We sent a 6-digit code to ${email}`;
      case 3: return 'Complete your profile information';
      case 4: return 'Your account has been created and is pending approval';
      default: return '';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
          
          {/* Progress Indicator */}
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`h-2 w-6 rounded-full ${
                    stepNumber <= step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
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
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify Code'}
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

          {step === 3 && (
            <Form {...step3Form}>
              <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={step3Form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="John"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step3Form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Doe"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={step3Form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+228 90 12 34 56"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step3Form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <DepartmentSelector
                          departments={departments}
                          value={field.value}
                          onValueChange={handleDepartmentChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step3Form.control}
                  name="jobPositionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Position</FormLabel>
                      <FormControl>
                        <JobPositionSelector
                          jobPositions={jobPositions}
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading || !selectedDepartmentId}
                          departmentId={selectedDepartmentId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleGoBack}
                    disabled={isLoading}
                  >
                    Back to Verification
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Success Message */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Welcome, {userName}!
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    Your account has been successfully created and is now 
                    <span className="font-medium text-yellow-600"> pending admin approval</span>.
                  </p>
                  <p>
                    You will receive an email notification once your account 
                    has been validated by an administrator.
                  </p>
                </div>
              </div>

              {/* What's Next */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <div className="font-medium text-blue-900 mb-2">What happens next?</div>
                <div className="text-blue-800 space-y-1">
                  <p>1. An administrator will review your application</p>
                  <p>2. You&apos;ll receive an email when approved</p>
                  <p>3. Once approved, you can sign in to your account</p>
                </div>
              </div>

              {/* Go to Login Button */}
              <Button 
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>
          )}

          {step !== 4 && (
            <div className="text-center text-sm text-gray-600">
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                  disabled={isLoading}
                >
                  Sign in here
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};