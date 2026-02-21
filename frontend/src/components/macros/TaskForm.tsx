import React, { useEffect, useState, useMemo } from 'react';
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
import { JobPosition, JobPositionResource } from '@/lib/resources/jobPosition';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

const formSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    description: z.string().min(1, 'Description is required'),
    order: z.coerce.number().int().min(1, 'Order must be at least 1'),
    isActive: z.boolean().default(true),
    intervenants: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
    initialData?: ApplicationTask;
    onSubmit: (data: FormValues) => Promise<void>;
    isLoading?: boolean;
}

export function TaskForm({ initialData, onSubmit, isLoading }: TaskFormProps) {
    const { t } = useTranslation('macros');
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchJobPositions = async () => {
            try {
                const data = await JobPositionResource.getAll({ active: true });
                setJobPositions(data);
            } catch (error) {
                console.error('Failed to fetch job positions', error);
            }
        };
        fetchJobPositions();
    }, []);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: initialData?.code || '',
            description: initialData?.description || '',
            order: initialData?.order || 1,
            isActive: initialData?.isActive ?? true,
            intervenants: initialData?.intervenants || [],
        },
    });

    const filteredJobPositions = useMemo(() => {
        if (!searchQuery) return jobPositions;
        return jobPositions.filter(jp =>
            jp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            jp.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [jobPositions, searchQuery]);

    const selectedIntervenants = form.watch('intervenants') || [];

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
                    name="intervenants"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Intervenants</FormLabel>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            {field.value && field.value.length > 0
                                                ? `${field.value.length} selected`
                                                : "Select intervenants"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[400px] p-0">
                                    <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                        <input
                                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Search job positions..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <ScrollArea className="h-72 p-1">
                                        {filteredJobPositions.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">No job positions found.</div>
                                        ) : (
                                            filteredJobPositions.map((jp) => (
                                                <DropdownMenuCheckboxItem
                                                    key={jp.id}
                                                    checked={field.value?.includes(jp.id)}
                                                    onCheckedChange={(checked) => {
                                                        const current = field.value || [];
                                                        const next = checked
                                                            ? [...current, jp.id]
                                                            : current.filter((id) => id !== jp.id);
                                                        field.onChange(next);
                                                    }}
                                                    onSelect={(e) => e.preventDefault()}
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium">{jp.title}</span>
                                                        <span className="text-xs text-muted-foreground">{jp.code}</span>
                                                    </div>
                                                </DropdownMenuCheckboxItem>
                                            ))
                                        )}
                                    </ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedIntervenants.map(id => {
                                    const jp = jobPositions.find(p => p.id === id);
                                    if (!jp) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="text-xs">
                                            {jp.code}
                                            <button
                                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const next = selectedIntervenants.filter(vid => vid !== id);
                                                    form.setValue('intervenants', next);
                                                }}
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>
                            <FormDescription>
                                Select the job positions responsible for this task.
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
