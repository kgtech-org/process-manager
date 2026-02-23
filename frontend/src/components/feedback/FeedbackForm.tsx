"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FeedbackTemplate, FeedbackQuestion, ProcessFeedback } from '@/lib/validation';
import { FeedbackResource } from '@/lib/resources/feedback';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Star, CheckCircle, AlertCircle } from 'lucide-react';

interface FeedbackFormProps {
    template: FeedbackTemplate;
    processId: string;
    macroId: string;
    onSuccess?: (feedback: ProcessFeedback) => void;
    onCancel?: () => void;
}

export default function FeedbackForm({
    template,
    processId,
    macroId,
    onSuccess,
    onCancel
}: FeedbackFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamically build a Zod schema based on the template questions
    const formSchema = React.useMemo(() => {
        const schemaFields: Record<string, z.ZodTypeAny> = {};

        template.questions.forEach((q) => {
            let fieldSchema: z.ZodTypeAny;

            switch (q.type) {
                case 'rating':
                case 'singleChoice':
                    fieldSchema = z.string();
                    break;
                case 'multiChoice':
                    fieldSchema = z.array(z.string());
                    break;
                case 'text':
                case 'longText':
                default:
                    fieldSchema = z.string();
                    break;
            }

            if (q.required) {
                if (q.type === 'multiChoice') {
                    fieldSchema = (fieldSchema as z.ZodArray<z.ZodString>).min(1, 'Please select at least one option');
                } else {
                    fieldSchema = (fieldSchema as z.ZodString).min(1, 'This field is required');
                }
            } else {
                fieldSchema = fieldSchema.optional().or(z.literal(''));
            }

            schemaFields[q.id] = fieldSchema;
        });

        return z.object(schemaFields);
    }, [template]);

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: template.questions.reduce((acc, q) => {
            acc[q.id] = q.type === 'multiChoice' ? [] : '';
            return acc;
        }, {} as Record<string, any>)
    });

    const onSubmit = async (data: Record<string, any>) => {
        try {
            setIsSubmitting(true);

            const responses = template.questions.map((q) => {
                let answer = data[q.id];
                if (Array.isArray(answer)) {
                    answer = answer.join(', ');
                }

                return {
                    questionId: q.id,
                    questionText: q.text,
                    responseType: q.type,
                    answer: String(answer || ''),
                };
            });

            const result = await FeedbackResource.submitFeedback({
                processId,
                macroId,
                templateId: template.id,
                responses,
            });

            toast.success('Feedback submitted successfully!');
            if (onSuccess) onSuccess(result);
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            toast.error(error.message || 'Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderQuestion = (q: FeedbackQuestion, index: number) => {
        const error = errors[q.id]?.message as string;

        return (
            <div key={q.id} className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <label className="block text-lg font-medium text-gray-900 mb-4">
                    <span className="text-blue-600 font-semibold mr-2">{index + 1}.</span>
                    {q.text} {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* Text Input */}
                {q.type === 'text' && (
                    <input
                        type="text"
                        {...register(q.id)}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                            }`}
                        placeholder="Type your answer here..."
                    />
                )}

                {/* Long Text Input */}
                {q.type === 'longText' && (
                    <textarea
                        {...register(q.id)}
                        rows={4}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                            }`}
                        placeholder="Type your detailed feedback here..."
                    />
                )}

                {/* Rating Input (1-5 Stars) */}
                {q.type === 'rating' && (
                    <Controller
                        control={control}
                        name={q.id}
                        render={({ field: { onChange, value } }) => (
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        onClick={() => onChange(String(star))}
                                        className={`p-2 rounded-full transition-all ${Number(value) >= star ? 'text-yellow-400 scale-110' : 'text-gray-300 hover:text-yellow-200'
                                            }`}
                                    >
                                        <Star className="w-8 h-8 fill-current" />
                                    </button>
                                ))}
                            </div>
                        )}
                    />
                )}

                {/* Single Choice (Radio) */}
                {q.type === 'singleChoice' && q.options && (
                    <div className="space-y-3">
                        {q.options.map((opt) => (
                            <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                    type="radio"
                                    value={opt}
                                    {...register(q.id)}
                                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-gray-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* Multi Choice (Checkbox) */}
                {q.type === 'multiChoice' && q.options && (
                    <div className="space-y-3">
                        {q.options.map((opt) => (
                            <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    value={opt}
                                    {...register(q.id)}
                                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-gray-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-3 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto py-8">
            {/* Header */}
            <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">{template.name}</h2>
                <p className="text-lg text-gray-600">{template.description}</p>
            </div>

            {/* Questions */}
            <div className="space-y-6">
                {template.questions
                    .sort((a, b) => a.order - b.order)
                    .map((q, idx) => renderQuestion(q, idx))}
            </div>

            {/* Submit/Cancel Actions */}
            <div className="mt-10 flex items-center justify-end gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-6"
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
            </div>
        </form>
    );
}
