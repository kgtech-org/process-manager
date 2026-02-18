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
    processCode: z.string().optional(),
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
            processCode: initialData?.processCode || '',
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {t('processCode', { defaultValue: 'Process Code' })}
                        </label>
                        <Input value={initialData.processCode} disabled className="bg-gray-100" />
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="processCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('processCode', { defaultValue: 'Process Code' })}</FormLabel>
                                <FormControl>
                                    <Input placeholder="M1_P1" {...field} />
                                </FormControl>
                                <FormDescription>
                                    {t('processCodeHelp', { defaultValue: 'Optional. Auto-generated if empty.' })}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('processTitle', { defaultValue: 'Process Title' })}</FormLabel>
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
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('description', { defaultValue: 'Detailed Description' })}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={t('descriptionPlaceholder', { defaultValue: 'Detailed description of the process operations...' })}
                                    className="min-h-[120px]"
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
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                    {t('active', { defaultValue: 'Active Status' })}
                                </FormLabel>
                                <FormDescription>
                                    {t('activeDescription', { defaultValue: 'Inactive processes are hidden from standard users' })}
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

                <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>
                        {t('cancel', { defaultValue: 'Reset' })}
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <span className="mr-2 animate-spin">⏳</span>
                                {t('saving', { defaultValue: 'Saving...' })}
                            </>
                        ) : (
                            t('save', { defaultValue: 'Save Changes' })
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
