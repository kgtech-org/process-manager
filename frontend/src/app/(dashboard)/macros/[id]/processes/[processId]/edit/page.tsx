'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { DocumentResource, Document } from '@/lib/resources/document';
import { ProcessForm } from '@/components/macros/ProcessForm';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditProcessPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation('macros');
    const { toast } = useToast();
    const macroId = params.id as string;
    const processId = params.processId as string;

    const [process, setProcess] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProcess = async () => {
            try {
                setLoading(true);
                const data = await DocumentResource.getById(processId);
                setProcess(data);
            } catch (error) {
                console.error('Failed to load process:', error);
                toast({
                    variant: 'destructive',
                    title: t('messages.errorLoading', { defaultValue: 'Error loading process' }),
                });
                router.push(`/macros/${macroId}/processes/${processId}`);
            } finally {
                setLoading(false);
            }
        };

        if (processId) {
            loadProcess();
        }
    }, [processId, macroId, t, toast, router]);

    const handleSubmit = async (data: any) => {
        try {
            await DocumentResource.update(processId, data);
            toast({
                title: t('messages.updateSuccess', { defaultValue: 'Process updated successfully' }),
            });
            router.push(`/macros/${macroId}/processes/${processId}`);
        } catch (error: any) {
            console.error('Failed to update process:', error);
            toast({
                variant: 'destructive',
                title: t('messages.updateFailed', { defaultValue: 'Update failed' }),
                description: error.message || t('messages.error'),
            });
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!process) return null;

    const breadcrumbItems = [
        { label: t('macros', { defaultValue: 'Macros' }), href: '/macros' },
        { label: process.processCode || process.reference, href: `/macros/${macroId}/processes/${processId}` },
        { label: t('edit', { defaultValue: 'Edit' }) },
    ];

    return (
        <div className="p-8">
            <Breadcrumb items={breadcrumbItems} className="mb-6" />

            <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('back', { defaultValue: 'Back' })}
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>{t('editProcess', { defaultValue: 'Edit Process' })}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProcessForm initialData={process} onSubmit={handleSubmit} />
                </CardContent>
            </Card>
        </div>
    );
}
