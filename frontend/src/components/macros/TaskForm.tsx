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
import { ApplicationTask } from '@/lib/resources/document';

const formSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    description: z.string().min(1, 'Description is required'),
    order: z.coerce.number().int().min(1, 'Order must be at least 1'),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
    initialData?: ApplicationTask;
    onSubmit: (data: FormValues) => Promise<void>;
    isLoading?: boolean;
}

export function TaskForm({ initialData, onSubmit, isLoading }: TaskFormProps) {
    const { t } = useTranslation('macros');

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: initialData?.code || '',
            description: initialData?.description || '',
            order: initialData?.order || 1,
            isActive: initialData?.isActive ?? true,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('code', { defaultValue: 'Code' })}</FormLabel>
                            <FormControl>
                                <div className="flex gap-2">
                                    <Input placeholder="M1_P1_T1" {...field} />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            // Simple auto-generate logic based on order if applicable
                                            // In a real app, we might need context from parent
                                            const order = form.getValues('order');
                                            if (order) {
                                                field.onChange(`T${order}`);
                                            }
                                        }}
                                    >
                                        Auto
                                    </Button>
                                </div>
                            </FormControl>
                            <FormDescription>
                                {t('codeHelp', { defaultValue: 'Unique identifier for the task' })}
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
                                    placeholder={t('descriptionPlaceholder', { defaultValue: 'Detailed task description' })}
                                    className="min-h-[150px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                {t('descriptionHelp', { defaultValue: 'Describe the actions required for this task' })}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('order', { defaultValue: 'Order' })}</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
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
                                    {t('activeDescription', { defaultValue: 'Enable or disable this task' })}
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
                    <Button type="button" variant="outline" onClick={() => form.reset()}>
                        {t('cancel', { defaultValue: 'Reset' })}
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? t('saving', { defaultValue: 'Saving...' }) : t('save', { defaultValue: 'Save Changes' })}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
