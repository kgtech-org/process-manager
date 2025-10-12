'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AvatarUpload } from './AvatarUpload';
import { DepartmentSelector } from './DepartmentSelector';
import { JobPositionSelector } from './JobPositionSelector';
import { SignatureManager } from '@/components/signatures';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { profileUpdateSchema, ProfileUpdateData, Department, JobPosition } from '@/lib/validation';

export const ProfileForm: React.FC = () => {
  const { t } = useTranslation('auth');
  const { user, refreshUser } = useAuth();
  const { isUpdating, updateProfile } = useProfile();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      departmentId: user?.departmentId || '',
      jobPositionId: user?.jobPositionId || '',
    },
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptData, positionData] = await Promise.all([
          authService.getDepartments(),
          authService.getJobPositions(),
        ]);
        setDepartments(deptData);
        setJobPositions(positionData);
        
        if (user?.departmentId) {
          setSelectedDepartmentId(user.departmentId);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
    };

    loadData();
  }, [user]);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        departmentId: user.departmentId || '',
        jobPositionId: user.jobPositionId || '',
      });
      setSelectedDepartmentId(user.departmentId || '');
    }
  }, [user, form]);

  // Load job positions when department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      authService.getJobPositions(selectedDepartmentId)
        .then(setJobPositions)
        .catch(console.error);
    }
  }, [selectedDepartmentId]);

  const handleSubmit = async (data: ProfileUpdateData) => {
    try {
      setError('');
      setSuccess('');
      
      await updateProfile(data);
      setSuccess(t('profile.updateSuccess'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || t('profile.updateFailed'));
    }
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    form.setValue('departmentId', departmentId);
    form.setValue('jobPositionId', ''); // Reset job position
  };

  const handleAvatarUpdate = async () => {
    // Refresh user data to get updated avatar URL
    try {
      await refreshUser();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">{t('common.loading', { ns: 'common', defaultValue: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* First Row: Avatar Upload and Signature Management - Side by Side on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar Upload Section */}
        <AvatarUpload
          currentAvatarUrl={user.avatar}
          onAvatarUpdate={handleAvatarUpdate}
        />

        {/* Signature Management Section */}
        <SignatureManager />
      </div>

      {/* Second Row: Profile Information - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.personalInfo')}</CardTitle>
          <CardDescription>
            {t('profile.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Status Messages */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
              {success}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.firstName')}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isUpdating} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.lastName')}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isUpdating} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Phone Number */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profile.phone')}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+228 90 12 34 56"
                        {...field}
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (Read-only) */}
              <FormItem>
                <FormLabel>{t('profile.email')}</FormLabel>
                <FormControl>
                  <Input 
                    value={user.email} 
                    disabled 
                    className="bg-gray-50"
                  />
                </FormControl>
                <p className="text-xs text-gray-500">
                  Email address cannot be changed. Contact admin for changes.
                </p>
              </FormItem>

              {/* Organizational Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <DepartmentSelector
                          departments={departments}
                          value={field.value || ''}
                          onValueChange={handleDepartmentChange}
                          disabled={isUpdating}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobPositionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Position</FormLabel>
                      <FormControl>
                        <JobPositionSelector
                          jobPositions={jobPositions}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          disabled={isUpdating || !selectedDepartmentId}
                          departmentId={selectedDepartmentId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Account Status Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Email Verified</label>
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};