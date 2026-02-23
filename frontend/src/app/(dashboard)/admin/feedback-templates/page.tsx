"use client";

import React, { useEffect, useState } from 'react';
import { FeedbackResource } from '@/lib/resources/feedback';
import { FeedbackTemplate, FeedbackQuestion } from '@/lib/validation';
import { Plus, Edit2, Trash2, Loader2, Copy, ToggleLeft, ToggleRight, LayoutTemplate, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { TemplateDialog } from './components/TemplateDialog';
import { TemplateDetailsDialog } from './components/TemplateDetailsDialog';
import { useTranslation } from '@/lib/i18n';

export default function TemplateManagerPage() {
    const { t } = useTranslation('feedback');
    const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedTemplate, setSelectedTemplate] = useState<FeedbackTemplate | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await FeedbackResource.getTemplates(false);
            setTemplates(data);
        } catch (error) {
            toast.error(t('manager.loadError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async (template: FeedbackTemplate) => {
        try {
            await FeedbackResource.updateTemplate(template.id, {
                name: template.name,
                description: template.description,
                questions: template.questions,
                isActive: !template.isActive,
            });
            const statusStr = !template.isActive ? t('manager.active').toLowerCase() : t('manager.inactive').toLowerCase();
            toast.success(t('manager.toggleSuccess', { status: statusStr }));
            loadTemplates();
        } catch (error) {
            toast.error(t('manager.saveErrorDesc', { ns: 'feedback' }));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('manager.deleteConfirm'))) return;
        try {
            await FeedbackResource.deleteTemplate(id);
            toast.success(t('manager.deleteSuccess'));
            loadTemplates();
        } catch (error) {
            toast.error(t('manager.deleteError'));
        }
    };

    const openCreateDialog = () => {
        setSelectedTemplate(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (template: FeedbackTemplate) => {
        setSelectedTemplate(template);
        setIsDialogOpen(true);
    };

    const openDetailsDialog = (template: FeedbackTemplate) => {
        setSelectedTemplate(template);
        setIsDetailsOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <LayoutTemplate className="w-8 h-8 text-blue-600" />
                        {t('manager.title')}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('manager.description')}
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Plus className="w-4 h-4" />
                    {t('manager.newTemplate')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 pr-4">{template.name}</h3>
                            <button
                                onClick={() => handleToggleActive(template)}
                                className={`flex-shrink-0 transition-colors ${template.isActive ? 'text-green-500' : 'text-gray-400'}`}
                                title={template.isActive ? t('manager.deactivate') : t('manager.activate')}
                            >
                                {template.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                            </button>
                        </div>

                        <p className="text-gray-600 text-sm flex-grow mb-6 line-clamp-3">
                            {template.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => openDetailsDialog(template)}>
                                {t('manager.questionsCount', { count: template.questions.length })}
                            </span>

                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openDetailsDialog(template)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(template.id)}
                                    className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <LayoutTemplate className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">{t('manager.noTemplates')}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {t('manager.noTemplatesDesc')}
                        </p>
                    </div>
                )}
            </div>

            <TemplateDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                template={selectedTemplate}
                onSaved={loadTemplates}
            />

            <TemplateDetailsDialog
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                template={selectedTemplate}
            />
        </div>
    );
}
