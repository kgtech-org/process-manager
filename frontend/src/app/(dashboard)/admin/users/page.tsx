'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { UserResource, type User, type PaginationData } from '@/lib/resources';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

// User interface is now imported from resources

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const statusFilter = filter === 'all' ? undefined : filter as 'pending' | 'active' | 'inactive';
        const response = await UserResource.getPaginated({
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter,
        });
        setUsers(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [pagination.page, pagination.limit, filter]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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

  const handleApprove = async (userId: string) => {
    try {
      await UserResource.validate(userId, { action: 'approve', role: 'user' });
      setUsers(users.map(user =>
        user.id === userId ? { ...user, status: 'active' as const } : user
      ));
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await UserResource.validate(userId, { action: 'reject' });
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      // If only one name, take first two letters
      return names[0].slice(0, 2).toUpperCase();
    }
    // Take first letter of first name and first letter of last name
    const firstName = names[0];
    const lastName = names[names.length - 1];
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
      { bg: 'bg-teal-100', text: 'text-teal-700' },
      { bg: 'bg-red-100', text: 'text-red-700' },
    ];

    // Simple hash function to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(newPageSize),
      page: 1 // Reset to first page when changing page size
    }));
  };

  const renderPaginationItems = () => {
    const items = [];
    const { page, totalPages } = pagination;

    // Always show first page
    if (totalPages > 0) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={page === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Show ellipsis if there's a gap
    if (page > 3) {
      items.push(<PaginationItem key="ellipsis1"><PaginationEllipsis /></PaginationItem>);
    }

    // Show pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Show ellipsis if there's a gap
    if (page < totalPages - 2) {
      items.push(<PaginationItem key="ellipsis2"><PaginationEllipsis /></PaginationItem>);
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={page === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
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

  return (
    <AdminGuard>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage user accounts, approvals, and permissions.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pagination.limit.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 per page</SelectItem>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({pagination.total} total)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-500">No users found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 ${getAvatarColor(user.name).bg} rounded-full flex items-center justify-center`}>
                          <span className={`${getAvatarColor(user.name).text} font-semibold text-sm`}>
                            {getInitials(user.name)}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          {getStatusBadge(user.status)}
                          {getRoleBadge(user.role)}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          {user.department && (
                            <span className="text-xs text-gray-500">
                              📁 {user.department.name}
                            </span>
                          )}
                          {user.jobPosition && (
                            <span className="text-xs text-gray-500">
                              💼 {user.jobPosition.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Joined: {formatDate(user.createdAt)}
                          </span>
                          {user.lastLogin && (
                            <span className="text-xs text-gray-500">
                              Last login: {formatDate(user.lastLogin)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {user.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(user.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-500 order-2 sm:order-1">
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              <div className="order-1 sm:order-2">
                <Pagination className="mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className={pagination.page >= pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}