'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { DomainResource, type Domain } from '@/lib/resources';
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

export default function AdminDomainsPage() {
    const { t } = useTranslation('domains');
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [newDomain, setNewDomain] = useState({
        name: '',
        code: '',
        description: '',
    });

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        try {
            const fetchedDomains = await DomainResource.getAll();
            setDomains(fetchedDomains);
        } catch (error) {
            console.error('Failed to fetch domains:', error);
            setDomains([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredDomains = domains.filter(domain =>
        domain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        domain.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateDomain = async () => {
        try {
            const createdDomain = await DomainResource.create({
                name: newDomain.name,
                code: newDomain.code,
                description: newDomain.description,
            });

            setDomains([...domains, createdDomain]);
            setNewDomain({ name: '', code: '', description: '' });
            setShowCreateDialog(false);
        } catch (error) {
            console.error('Failed to create domain:', error);
        }
    };

    const handleUpdateDomain = async () => {
        if (!editingDomain) return;
        try {
            const updatedDomain = await DomainResource.update(editingDomain.id, {
                name: editingDomain.name,
                code: editingDomain.code,
                description: editingDomain.description,
            });

            setDomains(domains.map(d =>
                d.id === editingDomain.id ? updatedDomain : d
            ));
            setEditingDomain(null);
            setShowEditDialog(false);
        } catch (error) {
            console.error('Failed to update domain:', error);
        }
    };

    const handleDeleteDomain = async (domainId: string) => {
        if (!window.confirm(t('messages.deleteConfirm'))) return;
        try {
            await DomainResource.delete(domainId);
            setDomains(domains.filter(d => d.id !== domainId));
        } catch (error) {
            console.error('Failed to delete domain:', error);
        }
    };

    const openEditDialog = (domain: Domain) => {
        setEditingDomain({ ...domain });
        setShowEditDialog(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Domain color mapping by code
    const getDomainColor = (code: string): { bg: string; text: string; icon: string } => {
        const colors: Record<string, { bg: string; text: string; icon: string }> = {
            NET: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600' },
            IT: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'text-indigo-600' },
            OPS: { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600' },
            GOV: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600' },
            DIG: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-600' },
            SEC: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-600' },
            STR: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600' },
        };
        return colors[code] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'text-gray-600' };
    };

    if (loading) {
        return (
            <AdminGuard>
                <div className="p-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </AdminGuard>
        );
    }

    return (
        <AdminGuard>
            <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
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
                                <DialogTitle>{t('actions.create')}</DialogTitle>
                                <DialogDescription>
                                    {t('subtitle')}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="name">{t('fields.name')}</Label>
                                    <Input
                                        id="name"
                                        value={newDomain.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDomain({ ...newDomain, name: e.target.value })}
                                        placeholder={t('placeholders.name')}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="code">{t('fields.code')}</Label>
                                    <Input
                                        id="code"
                                        value={newDomain.code}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDomain({ ...newDomain, code: e.target.value.toUpperCase() })}
                                        placeholder={t('placeholders.code')}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="description">{t('fields.description')}</Label>
                                    <Textarea
                                        id="description"
                                        value={newDomain.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDomain({ ...newDomain, description: e.target.value })}
                                        placeholder={t('placeholders.description')}
                                    />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                        {t('actions.cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleCreateDomain}
                                        disabled={!newDomain.name || !newDomain.code}
                                    >
                                        {t('actions.save')}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">{t('stats.total')}</p>
                                    <p className="text-3xl font-bold text-gray-900">{domains.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">{t('stats.active')}</p>
                                    <p className="text-3xl font-bold text-green-600">{domains.filter(d => d.active).length}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">{t('stats.inactive')}</p>
                                    <p className="text-3xl font-bold text-gray-400">{domains.filter(d => !d.active).length}</p>
                                </div>
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <Input
                        placeholder={t('placeholders.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />
                </div>

                {/* Domains Grid */}
                {filteredDomains.length === 0 ? (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                <p className="text-gray-500">{t('messages.noResults')}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDomains.map((domain) => {
                            const colors = getDomainColor(domain.code);
                            return (
                                <Card key={domain.id} className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                                    {/* Color stripe at top */}
                                    <div className={`h-2 ${colors.bg.replace('100', '500')}`} />
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                                                    <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{domain.name}</CardTitle>
                                                    <Badge variant="outline" className={`mt-1 ${colors.text} border-current`}>
                                                        {domain.code}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Badge className={domain.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                                {domain.active ? t('filters.active') : t('filters.inactive')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {domain.description && (
                                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{domain.description}</p>
                                        )}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <span className="text-xs text-gray-400">
                                                {t('fields.createdAt')}: {formatDate(domain.createdAt)}
                                            </span>
                                            <div className="flex items-center space-x-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditDialog(domain)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteDomain(domain.id)}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Edit Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('actions.edit')}</DialogTitle>
                            <DialogDescription>
                                {t('subtitle')}
                            </DialogDescription>
                        </DialogHeader>
                        {editingDomain && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="edit-name">{t('fields.name')}</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingDomain.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                                        placeholder={t('placeholders.name')}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-code">{t('fields.code')}</Label>
                                    <Input
                                        id="edit-code"
                                        value={editingDomain.code}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingDomain({ ...editingDomain, code: e.target.value.toUpperCase() })}
                                        placeholder={t('placeholders.code')}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-description">{t('fields.description')}</Label>
                                    <Textarea
                                        id="edit-description"
                                        value={editingDomain.description || ''}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingDomain({ ...editingDomain, description: e.target.value })}
                                        placeholder={t('placeholders.description')}
                                    />
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                                        {t('actions.cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleUpdateDomain}
                                        disabled={!editingDomain.name || !editingDomain.code}
                                    >
                                        {t('actions.save')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminGuard>
    );
}
