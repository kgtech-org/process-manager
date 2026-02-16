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
import { Macro } from '@/lib/resources/macro';

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface MacroFormProps {
    initialData?: Macro;
    onSubmit: (data: FormValues) => Promise<void>;
    isLoading?: boolean;
}

export function MacroForm({ initialData, onSubmit, isLoading }: MacroFormProps) {
    const { t } = useTranslation('macros');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || '',
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
                            {t('code', { defaultValue: 'Code' })}
                        </label>
                        <Input value={initialData.code} disabled className="bg-gray-100" />
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('name', { defaultValue: 'Name' })}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('namePlaceholder', { defaultValue: 'Enter macro name' })} {...field} />
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
                            <FormDescription>
                                {t('shortDescriptionHelp', { defaultValue: 'A brief summary of the macro (1-2 sentences)' })}
                            </FormDescription>
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
                                    {t('activeDescription', { defaultValue: 'Enable or disable this macro' })}
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
