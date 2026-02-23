"use client";

import React, { useEffect, useState } from 'react';
import { FeedbackResource } from '@/lib/resources/feedback';
import { ProcessResource } from '@/lib/resources/process';
import { UserResource } from '@/lib/resources/user';
import { ProcessFeedback, User } from '@/lib/validation';
import { Process } from '@/types/macro';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Search, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminFeedbackDashboard() {
    const [feedbacks, setFeedbacks] = useState<ProcessFeedback[]>([]);
    const [filteredFeedbacks, setFilteredFeedbacks] = useState<ProcessFeedback[]>([]);
    const [processes, setProcesses] = useState<Record<string, Process>>({});
    const [users, setUsers] = useState<Record<string, User>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);

            const [feedbackData, processData, userData] = await Promise.all([
                FeedbackResource.getAllFeedback(),
                ProcessResource.getAll(),
                UserResource.getAll()
            ]);

            const processMap = processData.reduce((acc: Record<string, Process>, p: Process) => {
                acc[p.id] = p;
                return acc;
            }, {} as Record<string, Process>);

            const userMap = userData.reduce((acc: Record<string, User>, u: User) => {
                acc[u.id] = u;
                return acc;
            }, {} as Record<string, User>);

            setProcesses(processMap);
            setUsers(userMap);
            setFeedbacks(feedbackData);
            setFilteredFeedbacks(feedbackData);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Erreur',
                description: 'Erreur lors du chargement des données.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let result = feedbacks;

        if (statusFilter !== 'all') {
            result = result.filter(f => f.status === statusFilter);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(f => {
                const process = processes[f.processId];
                const user = users[f.userId];
                const processName = process?.title?.toLowerCase() || '';
                const userName = `${user?.firstName} ${user?.lastName}`.toLowerCase() || '';

                return processName.includes(lowerQuery) || userName.includes(lowerQuery);
            });
        }

        setFilteredFeedbacks(result);
    }, [searchQuery, statusFilter, feedbacks, processes, users]);

    const handleUpdateStatus = async (id: string, newStatus: 'reviewed' | 'addressed') => {
        try {
            await FeedbackResource.updateFeedbackStatus(id, { status: newStatus });
            toast({
                title: 'Succès',
                description: 'Statut mis à jour',
            });
            loadData(); // Reload to get fresh data
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Erreur lors de la mise à jour du statut',
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'submitted':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Nouveau</Badge>;
            case 'reviewed':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200"><Search className="w-3 h-3 mr-1" /> En cours d'analyse</Badge>;
            case 'addressed':
                return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Traité</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                        Tableau de Bord des Retours
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Consultez et gérez les retours d'expérience sur les processus de l'entreprise.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par processus ou utilisateur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium text-gray-700">Statut:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Tous</option>
                            <option value="submitted">Nouveau</option>
                            <option value="reviewed">En analyse</option>
                            <option value="addressed">Traité</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processus</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredFeedbacks.map((feedback) => (
                                <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(feedback.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{processes[feedback.processId]?.title || 'Processus Inconnu'}</div>
                                        <div className="text-xs text-gray-500">{processes[feedback.processId]?.processCode}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {users[feedback.userId] ? `${users[feedback.userId].firstName} ${users[feedback.userId].lastName}` : 'Utilisateur Inconnu'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(feedback.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            {feedback.status === 'submitted' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus(feedback.id, 'reviewed')}
                                                >
                                                    Marquer en analyse
                                                </Button>
                                            )}
                                            {(feedback.status === 'submitted' || feedback.status === 'reviewed') && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus(feedback.id, 'addressed')}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    Marquer traité
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredFeedbacks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Aucun retour trouvé correspondant à vos critères.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
