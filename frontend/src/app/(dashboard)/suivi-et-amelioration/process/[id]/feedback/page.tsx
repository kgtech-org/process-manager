"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProcessResource } from '@/lib/resources/process';
import { FeedbackResource } from '@/lib/resources/feedback';
import { FeedbackTemplate } from '@/lib/validation';
import { Process } from '@/types/macro';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ProcessFeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const processId = params.id as string;

    const [process, setProcess] = useState<Process | null>(null);
    const [template, setTemplate] = useState<FeedbackTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (processId) {
            loadData();
        }
    }, [processId]);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // 1. Load Process Details
            const processData = await ProcessResource.getById(processId);
            setProcess(processData);

            // 2. Load Active Templates (Pick the first active one for now, or specifically standard one)
            // For Issue #60, we seed a default "Default Process Evaluation" template
            const templates = await FeedbackResource.getTemplates(true);
            if (templates && templates.length > 0) {
                setTemplate(templates[0]);
            } else {
                toast({
                    title: 'Attention',
                    description: 'Aucun modèle d\'évaluation actif.',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les données du processus.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccess = () => {
        setIsSuccess(true);
        toast({
            title: 'Succès',
            description: 'Merci pour vos retours !',
        });
    };

    const handleCancel = () => {
        router.push('/suivi-et-amelioration');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!process || !template) {
        return (
            <div className="max-w-3xl mx-auto py-12 text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Erreur de chargement</h2>
                <p className="text-gray-600 mb-8">Impossible de charger le formulaire d'évaluation pour ce processus.</p>
                <Button onClick={handleCancel} className="bg-blue-600 hover:bg-blue-700">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la liste
                </Button>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="max-w-3xl mx-auto py-16 px-6 text-center bg-white rounded-2xl shadow-sm border border-gray-100 mt-8">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Feedback Envoyé !</h2>
                <p className="text-lg text-gray-600 mb-8">
                    Merci d'avoir pris le temps d'évaluer le processus <strong>{process.title}</strong>.
                    Vos retours sont précieux pour l'amélioration continue de nos processus.
                </p>
                <Button onClick={handleCancel} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-lg flex items-center gap-2 mx-auto">
                    Retour au Suivi <ArrowRight className="w-5 h-5" />
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Back Button & Header */}
            <button
                onClick={handleCancel}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-8 group"
            >
                <ArrowLeft className="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform" />
                Retour aux processus
            </button>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 border border-blue-100/50">
                <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {process.processCode}
                    </span>
                    <span className="text-gray-500 text-sm">Évaluation de processus</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{process.title}</h1>
                <p className="text-gray-600 text-lg">{process.description}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <FeedbackForm
                    template={template}
                    processId={process.id}
                    macroId={process.macroId}
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    );
}
