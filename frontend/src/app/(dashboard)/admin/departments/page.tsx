'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { DepartmentResource, type Department } from '@/lib/resources';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Department interface is now imported from resources

export default function AdminDepartmentsPage() {
  const { t } = useTranslation('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    code: '',
    description: '',
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const fetchedDepartments = await DepartmentResource.getAll();
        setDepartments(fetchedDepartments);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDepartment = async () => {
    try {
      const createdDepartment = await DepartmentResource.create({
        name: newDepartment.name,
        code: newDepartment.code,
        description: newDepartment.description,
      });

      setDepartments([...departments, createdDepartment]);
      setNewDepartment({ name: '', code: '', description: '' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create department:', error);
    }
  };

  const handleToggleActive = async (departmentId: string) => {
    try {
      const department = departments.find(d => d.id === departmentId);
      if (department) {
        if (department.active) {
          await DepartmentResource.deactivate(departmentId);
        } else {
          await DepartmentResource.activate(departmentId);
        }
        setDepartments(departments.map(dept =>
          dept.id === departmentId ? { ...dept, active: !dept.active } : dept
        ));
      }
    } catch (error) {
      console.error('Failed to toggle department status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  return (
    <AdminGuard>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-2">
              {t('subtitle')}
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('actions.create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('create.title')}</DialogTitle>
                <DialogDescription>
                  {t('create.subtitle')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('form.name')}</Label>
                  <Input
                    id="name"
                    value={newDepartment.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    placeholder={t('form.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="code">{t('form.code')}</Label>
                  <Input
                    id="code"
                    value={newDepartment.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDepartment({ ...newDepartment, code: e.target.value.toUpperCase() })}
                    placeholder={t('form.codePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="description">{t('form.description')}</Label>
                  <Textarea
                    id="description"
                    value={newDepartment.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    placeholder={t('form.descriptionPlaceholder')}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    {t('actions.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateDepartment}
                    disabled={!newDepartment.name || !newDepartment.code}
                  >
                    {t('actions.createDepartment')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Departments List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('list.title', { count: filteredDepartments.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDepartments.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-gray-500">{t('list.empty')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDepartments.map((department) => (
                  <div key={department.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{department.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {department.code}
                          </Badge>
                          <Badge className={department.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {department.active ? t('status.active') : t('status.inactive')}
                          </Badge>
                        </div>
                        {department.description && (
                          <p className="text-sm text-gray-500 mb-1">{department.description}</p>
                        )}
                        <div className="flex items-center space-x-4">
                          {department.parent && (
                            <span className="text-xs text-gray-500">
                              📁 {t('details.parent')}: {department.parent.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {t('details.created')}: {formatDate(department.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(department.id)}
                      >
                        {department.active ? t('actions.deactivate') : t('actions.activate')}
                      </Button>
                      <Button size="sm" variant="outline">
                        {t('actions.edit')}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                        {t('actions.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}