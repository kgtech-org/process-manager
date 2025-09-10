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
      name: '',
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
      router.push('/login?message=Registration successful! Please wait for admin approval.');
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
      default: return 'Registration';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Enter your email address to get started';
      case 2: return `We sent a 6-digit code to ${email}`;
      case 3: return 'Complete your profile information';
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
              {[1, 2, 3].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`h-2 w-8 rounded-full ${
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
                <FormField
                  control={step3Form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="John Doe"
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
        </CardContent>
      </Card>
    </div>
  );
};