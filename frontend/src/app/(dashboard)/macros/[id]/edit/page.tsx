'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { MacroResource, Macro } from '@/lib/resources/macro';
import { MacroForm } from '@/components/macros/MacroForm';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditMacroPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation('macros');
    const { toast } = useToast();
    const macroId = params.id as string;

    const [macro, setMacro] = useState<Macro | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMacro = async () => {
            try {
                setLoading(true);
                const data = await MacroResource.getById(macroId);
                setMacro(data);
            } catch (error) {
                console.error('Failed to load macro:', error);
                toast({
                    variant: 'destructive',
                    title: t('messages.errorLoading', { defaultValue: 'Error loading macro' }),
                });
                router.push('/macros');
            } finally {
                setLoading(false);
            }
        };

        if (macroId) {
            loadMacro();
        }
    }, [macroId, t, toast, router]);

    const handleSubmit = async (data: any) => {
        try {
            await MacroResource.update(macroId, data);
            toast({
                title: t('messages.updateSuccess', { defaultValue: 'Macro updated successfully' }),
            });
            router.push(`/macros/${macroId}`);
        } catch (error: any) {
            console.error('Failed to update macro:', error);
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

    if (!macro) return null;

    const breadcrumbItems = [
        { label: t('macros', { defaultValue: 'Macros' }), href: '/macros' },
        { label: `${macro.code} - ${macro.name}`, href: `/macros/${macroId}` },
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
                    <CardTitle>{t('editMacro', { defaultValue: 'Edit Macro' })}</CardTitle>
                </CardHeader>
                <CardContent>
                    <MacroForm initialData={macro} onSubmit={handleSubmit} />
                </CardContent>
            </Card>
        </div>
    );
}
