"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeedbackTemplate } from '@/lib/validation';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: FeedbackTemplate | null;
}

export function TemplateDetailsDialog({ open, onOpenChange, template }: Props) {
    const { t } = useTranslation('feedback');

    if (!template) return null;

    const translateType = (type: string) => {
        const types: Record<string, string> = {
            text: t('dialog.types.text'),
            longText: t('dialog.types.longText'),
            rating: t('dialog.types.rating'),
            singleChoice: t('dialog.types.singleChoice'),
            multiChoice: t('dialog.types.multiChoice'),
        };
        return types[type] || type;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t('details.title')}</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
                                {template.isActive ? (
                                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">{t('manager.active')}</span>
                                ) : (
                                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{t('manager.inactive')}</span>
                                )}
                            </div>
                            <p className="text-gray-600">{template.description}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">{t('dialog.questions')} ({template.questions.length})</h3>
                            <div className="space-y-4">
                                {template.questions.sort((a, b) => a.order - b.order).map((q, idx) => (
                                    <div key={q.id || idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    <span className="text-gray-500 mr-2">{idx + 1}.</span>
                                                    {q.text}
                                                    {q.required && <span className="text-red-500 ml-1">*</span>}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">{t('dialog.qType')}: {translateType(q.type)}</p>
                                            </div>
                                        </div>

                                        {['singleChoice', 'multiChoice'].includes(q.type) && q.options && q.options.length > 0 && (
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {q.options.map((opt, i) => (
                                                    <div key={i} className="flex items-center text-sm text-gray-600 bg-white p-2 border rounded">
                                                        {q.type === 'multiChoice' ? <div className="w-3 h-3 bg-gray-200 rounded-sm mr-2.5" /> : <Circle className="w-3 h-3 text-gray-300 mr-2.5" />}
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'rating' && (
                                            <div className="mt-3 flex gap-1">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 bg-white">
                                                        {i}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
