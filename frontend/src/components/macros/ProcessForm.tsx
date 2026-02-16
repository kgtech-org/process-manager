import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n';
import { Document } from '@/lib/resources/document';

const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface ProcessFormProps {
    initialData?: Document;
    onSubmit: (data: FormValues) => Promise<void>;
    isLoading?: boolean;
}

export function ProcessForm({ initialData, onSubmit, isLoading }: ProcessFormProps) {
    const { t } = useTranslation('macros');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || '',
            shortDescription: initialData?.shortDescription || '',
            description: initialData?.description || '',
            isActive: initialData?.isActive ?? true,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {initialData && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t('processCode', { defaultValue: 'Process Code' })}
                            </label>
                            <Input value={initialData.processCode} disabled className="bg-gray-100" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {t('reference', { defaultValue: 'Reference' })}
                            </label>
                            <Input value={initialData.reference} disabled className="bg-gray-100" />
                        </div>
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('title', { defaultValue: 'Title' })}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('titlePlaceholder', { defaultValue: 'Enter process title' })} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="shortDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('shortDescription', { defaultValue: 'Short Description' })}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('shortDescriptionPlaceholder', { defaultValue: 'Brief summary' })} {...field} />
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
                            <FormLabel>{t('description', { defaultValue: 'Description' })}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={t('descriptionPlaceholder', { defaultValue: 'Detailed description' })}
                                    rows={5}
                                    {...field}
                                />
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
                                <FormLabel className="text-base">
                                    {t('active', { defaultValue: 'Active' })}
                                </FormLabel>
                                <FormDescription>
                                    {t('activeDescription', { defaultValue: 'Enable or disable this process' })}
                                </FormDescription>
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

                <div className="flex justify-end space-x-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? t('saving', { defaultValue: 'Saving...' }) : t('save', { defaultValue: 'Save Changes' })}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
