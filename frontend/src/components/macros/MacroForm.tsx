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

// If no code is present, we could auto-generate or ask user. 
// For now, let's add a hidden code field that auto-generates M{random} if not present,
// or better, let's add the Code field to the form as it is required.
const formSchema = z.object({
    code: z.string().min(1, 'Code is required'), // Added code validation
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('code', { defaultValue: 'Code' })}</FormLabel>
                                <FormControl>
                                    <Input placeholder="M1" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>{t('name', { defaultValue: 'Name' })}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('namePlaceholder', { defaultValue: 'Enter macro name' })} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

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
                                {t('shortDescriptionHelp', { defaultValue: 'A brief summary (1-2 sentences)' })}
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
                            <FormLabel>{t('description', { defaultValue: 'Detailed Description' })}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={t('descriptionPlaceholder', { defaultValue: 'Detailed description of the macro domain...' })}
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
                                    {t('activeDescription', { defaultValue: 'Inactive macros are hidden from standard users' })}
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
        </Form >
    );
}
