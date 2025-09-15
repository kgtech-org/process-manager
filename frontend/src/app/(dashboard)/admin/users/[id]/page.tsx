'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { UserResource, type User } from '@/lib/resources';
import { ArrowLeft, Mail, Phone, Calendar, Shield, Building, Briefcase } from 'lucide-react';

interface UserDetailsPageProps {
  params: {
    id: string;
  };
}

export default function UserDetailsPage({ params }: UserDetailsPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  // Helper functions for avatar
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].slice(0, 2).toUpperCase();
    }
    const firstName = names[0];
    const lastName = names[names.length - 1];
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: 'from-blue-500 to-blue-600', text: 'text-white' },
      { bg: 'from-green-500 to-green-600', text: 'text-white' },
      { bg: 'from-purple-500 to-purple-600', text: 'text-white' },
      { bg: 'from-orange-500 to-orange-600', text: 'text-white' },
      { bg: 'from-pink-500 to-pink-600', text: 'text-white' },
      { bg: 'from-indigo-500 to-indigo-600', text: 'text-white' },
      { bg: 'from-teal-500 to-teal-600', text: 'text-white' },
      { bg: 'from-red-500 to-red-600', text: 'text-white' },
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const fetchedUser = await UserResource.getById(params.id);
        setUser(fetchedUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setError('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  const handleApprove = async () => {
    if (!user) return;
    try {
      await UserResource.validate(user.id, { action: 'approve', role: 'user' });
      setUser({ ...user, status: 'active' });
    } catch (error) {
      console.error('Failed to approve user:', error);
      setError('Failed to approve user');
    }
  };

  const handleReject = async () => {
    if (!user) return;
    try {
      await UserResource.validate(user.id, { action: 'reject' });
      // Redirect back to users list after rejection
      router.push('/admin/users');
    } catch (error) {
      console.error('Failed to reject user:', error);
      setError('Failed to reject user');
    }
  };

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'manager':
        return <Badge className="bg-blue-100 text-blue-800">Manager</Badge>;
      case 'user':
        return <Badge variant="outline">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (error || !user) {
    return (
      <AdminGuard>
        <div className="p-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-lg font-medium mb-4">
              {error || 'User not found'}
            </div>
            <Button onClick={() => router.push('/admin/users')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/users')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600 mt-2">
            View and manage user information and permissions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  {/* Avatar */}
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={`h-full w-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(user.name).bg}`}>
                        <span className={`${getAvatarColor(user.name).text} text-xl font-bold`}>
                          {getInitials(user.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex justify-center gap-2 mt-3">
                      {getStatusBadge(user.status)}
                      {getRoleBadge(user.role)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {user.status === 'pending' && (
                    <div className="flex gap-3 w-full">
                      <Button
                        onClick={handleApprove}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={handleReject}
                        variant="outline"
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  {user.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{user.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {user.department && (
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Department</p>
                        <p className="text-sm text-gray-600">
                          {user.department.name} ({user.department.code})
                        </p>
                      </div>
                    </div>
                  )}
                  {user.jobPosition && (
                    <div className="flex items-center space-x-3">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Job Position</p>
                        <p className="text-sm text-gray-600">
                          {user.jobPosition.title} ({user.jobPosition.code})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Role</p>
                        <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Verified</p>
                        <p className="text-sm text-gray-600">
                          {user.emailVerified ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Created</p>
                        <p className="text-sm text-gray-600">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                    {user.lastLogin && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Last Login</p>
                          <p className="text-sm text-gray-600">{formatDate(user.lastLogin)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {user.validatedAt && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Validated</p>
                          <p className="text-sm text-gray-600">{formatDate(user.validatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}