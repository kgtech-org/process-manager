"use client";

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CreateFeedbackTemplateData, FeedbackResource } from '@/lib/resources/feedback';
import { FeedbackTemplate } from '@/lib/validation';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template?: FeedbackTemplate | null;
    onSaved: () => void;
}

export function TemplateDialog({ open, onOpenChange, template, onSaved }: Props) {
    const { t } = useTranslation('feedback');

    // Create schema dynamically to get translations
    const questionSchema = z.object({
        text: z.string().min(2, t('validation.qTextRequired')),
        type: z.enum(['text', 'longText', 'rating', 'singleChoice', 'multiChoice']),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
    });

    const templateFormSchema = z.object({
        name: z.string().min(2, t('validation.nameRequired')),
        description: z.string().min(2, t('validation.descRequired')),
        isActive: z.boolean().default(true),
        questions: z.array(questionSchema).min(1, t('validation.questionsRequired')),
    });

    type TemplateFormValues = z.infer<typeof templateFormSchema>;

    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateFormSchema),
        defaultValues: {
            name: '',
            description: '',
            isActive: true,
            questions: [{ text: '', type: 'text', required: false, options: [] }],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions"
    });

    useEffect(() => {
        if (template && open) {
            form.reset({
                name: template.name,
                description: template.description,
                isActive: template.isActive,
                questions: template.questions.map(q => ({
                    text: q.text,
                    type: q.type as any,
                    required: q.required,
                    options: q.options || [],
                }))
            });
        } else if (open) {
            form.reset({
                name: '',
                description: '',
                isActive: true,
                questions: [{ text: '', type: 'text', required: false, options: [] }],
            });
        }
    }, [template, open, form]);

    const onSubmit = async (data: TemplateFormValues) => {
        try {
            const payload: CreateFeedbackTemplateData = {
                ...data,
                questions: data.questions.map((q, idx) => ({
                    text: q.text,
                    type: q.type as any,
                    required: q.required,
                    options: q.options?.length ? q.options : undefined,
                    order: idx + 1
                }))
            };

            if (template?.id) {
                await FeedbackResource.updateTemplate(template.id, payload);
                toast.success(t('dialog.saveSuccessDesc'));
            } else {
                await FeedbackResource.createTemplate(payload);
                toast.success(t('dialog.saveSuccessDesc'));
            }
            onSaved();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error(t('dialog.saveErrorDesc'));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{template ? t('dialog.editTitle') : t('dialog.newTitle')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('dialog.nameLabel')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t('dialog.namePlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('dialog.descLabel')}</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder={t('dialog.descPlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base text-gray-900">{t('dialog.isActive')}</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-slate-900">{t('dialog.questions')}</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ text: '', type: 'text', required: false, options: [] })}
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" /> {t('dialog.addBtn')}
                                </Button>
                            </div>

                            {fields.map((field, index) => {
                                const questionType = form.watch(`questions.${index}.type`);
                                return (
                                    <div key={field.id} className="relative bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="absolute top-4 right-4 text-slate-400 hover:text-red-500 cursor-pointer" onClick={() => remove(index)}>
                                            <Trash2 className="w-5 h-5" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-8">
                                            <FormField
                                                control={form.control}
                                                name={`questions.${index}.text`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-full">
                                                        <FormLabel>{t('dialog.qText')}</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`questions.${index}.type`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t('dialog.qType')}</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="text">{t('dialog.types.text')}</SelectItem>
                                                                <SelectItem value="longText">{t('dialog.types.longText')}</SelectItem>
                                                                <SelectItem value="rating">{t('dialog.types.rating')}</SelectItem>
                                                                <SelectItem value="singleChoice">{t('dialog.types.singleChoice')}</SelectItem>
                                                                <SelectItem value="multiChoice">{t('dialog.types.multiChoice')}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`questions.${index}.required`}
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-8">
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal text-slate-700">{t('dialog.qRequired')}</FormLabel>
                                                    </FormItem>
                                                )}
                                            />

                                            {['singleChoice', 'multiChoice'].includes(questionType) && (
                                                <FormField
                                                    control={form.control}
                                                    name={`questions.${index}.options`}
                                                    render={({ field }) => {
                                                        const value = Array.isArray(field.value) ? field.value : [];
                                                        const stringValue = value.join(', ');
                                                        return (
                                                            <FormItem className="col-span-full">
                                                                <FormLabel>{t('dialog.optionsLabel')}</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        value={stringValue}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const split = val.split(',').map(s => s.trim()).filter(Boolean);
                                                                            field.onChange(split);
                                                                            e.target.value = val;
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {form.formState.errors.questions?.root && (
                                <p className="text-red-500 text-sm font-medium">{form.formState.errors.questions.root.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {t('dialog.cancel')}
                            </Button>
                            <Button type="submit">
                                {t('dialog.save')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
