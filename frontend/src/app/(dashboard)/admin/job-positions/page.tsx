'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { JobPositionResource, DepartmentResource, type JobPosition, type Department } from '@/lib/resources';
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

// JobPosition and Department interfaces are now imported from resources

export default function AdminJobPositionsPage() {
  const { t } = useTranslation('jobPositions');
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPosition, setNewPosition] = useState({
    title: '',
    code: '',
    description: '',
    departmentId: '',
    requiredSkills: '',
    level: 'entry',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedJobPositions, fetchedDepartments] = await Promise.all([
          JobPositionResource.getAll(),
          DepartmentResource.getAll()
        ]);
        setJobPositions(fetchedJobPositions);
        setDepartments(fetchedDepartments);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setJobPositions([]);
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPositions = jobPositions.filter(position => {
    const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (position.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesDepartment = departmentFilter === 'all' || position.department?.id === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const handleCreatePosition = async () => {
    try {
      const createdPosition = await JobPositionResource.create({
        title: newPosition.title,
        code: newPosition.code,
        description: newPosition.description,
        departmentId: newPosition.departmentId,
        level: newPosition.level,
        requiredSkills: newPosition.requiredSkills.split(',').map(skill => skill.trim()).filter(skill => skill),
      });

      setJobPositions([...jobPositions, createdPosition]);
      setNewPosition({ title: '', code: '', description: '', departmentId: '', requiredSkills: '', level: 'entry' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create job position:', error);
    }
  };

  const handleToggleActive = async (positionId: string) => {
    try {
      const position = jobPositions.find(p => p.id === positionId);
      if (position) {
        if (position.active) {
          await JobPositionResource.deactivate(positionId);
        } else {
          await JobPositionResource.activate(positionId);
        }
        setJobPositions(jobPositions.map(pos =>
          pos.id === positionId ? { ...pos, active: !pos.active } : pos
        ));
      }
    } catch (error) {
      console.error('Failed to toggle job position status:', error);
    }
  };

  const getLevelBadge = (level: JobPosition['level']) => {
    switch (level) {
      case 'entry':
        return <Badge className="bg-green-100 text-green-800">{t('levels.entry')}</Badge>;
      case 'mid':
        return <Badge className="bg-blue-100 text-blue-800">{t('levels.mid')}</Badge>;
      case 'senior':
        return <Badge className="bg-purple-100 text-purple-800">{t('levels.senior')}</Badge>;
      case 'lead':
        return <Badge className="bg-red-100 text-red-800">{t('levels.lead')}</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('create.title')}</DialogTitle>
                <DialogDescription>
                  {t('create.subtitle')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">{t('form.title')}</Label>
                  <Input
                    id="title"
                    value={newPosition.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPosition({ ...newPosition, title: e.target.value })}
                    placeholder={t('form.titlePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="code">{t('form.code')}</Label>
                  <Input
                    id="code"
                    value={newPosition.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPosition({ ...newPosition, code: e.target.value.toUpperCase() })}
                    placeholder={t('form.codePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="department">{t('form.department')}</Label>
                  <Select value={newPosition.departmentId} onValueChange={(value) => setNewPosition({ ...newPosition, departmentId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.filter(d => d.active).map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="level">{t('form.level')}</Label>
                  <Select value={newPosition.level} onValueChange={(value: JobPosition['level']) => setNewPosition({ ...newPosition, level: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">{t('levels.entryFull')}</SelectItem>
                      <SelectItem value="mid">{t('levels.midFull')}</SelectItem>
                      <SelectItem value="senior">{t('levels.seniorFull')}</SelectItem>
                      <SelectItem value="lead">{t('levels.leadFull')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="skills">{t('form.skills')}</Label>
                  <Input
                    id="skills"
                    value={newPosition.requiredSkills}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPosition({ ...newPosition, requiredSkills: e.target.value })}
                    placeholder={t('form.skillsPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="description">{t('form.description')}</Label>
                  <Textarea
                    id="description"
                    value={newPosition.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPosition({ ...newPosition, description: e.target.value })}
                    placeholder={t('form.descriptionPlaceholder')}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    {t('actions.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreatePosition}
                    disabled={!newPosition.title || !newPosition.code || !newPosition.departmentId}
                  >
                    {t('actions.createPosition')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder={t('filters.department.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.department.all')}</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Job Positions List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('list.title', { count: filteredPositions.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPositions.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
                <p className="text-gray-500">{t('list.empty')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPositions.map((position) => (
                  <div key={position.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">{position.title}</p>
                          {getLevelBadge(position.level)}
                          <Badge className={position.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {position.active ? t('status.active') : t('status.inactive')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          📁 {position.department?.name || t('details.noDepartment')} {position.department?.code ? `(${position.department.code})` : ''}
                        </p>
                        {position.description && (
                          <p className="text-sm text-gray-500 mb-1">{position.description}</p>
                        )}
                        {position.requiredSkills && position.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {position.requiredSkills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {position.requiredSkills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{position.requiredSkills.length - 3} {t('details.moreSkills')}
                              </Badge>
                            )}
                          </div>
                        )}
                        <span className="text-xs text-gray-500">
                          {t('details.created')}: {formatDate(position.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(position.id)}
                      >
                        {position.active ? t('actions.deactivate') : t('actions.activate')}
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