"use client";

import React, { useEffect, useState } from 'react';
import { ProcessResource } from '@/lib/resources/process';
import { MacroResource } from '@/lib/resources/macro';
import { Process, Macro } from '@/types/macro';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ArrowRight, MessageSquare, Plus, Activity, ArrowUpAZ, ArrowDownZA } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProcessFeedbackList() {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [macros, setMacros] = useState<Macro[]>([]);
    const [filteredProcesses, setFilteredProcesses] = useState<Process[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // New state for filtering and sorting
    const [macroFilter, setMacroFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('recent');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        let result = processes;

        // Apply macro filter
        if (macroFilter !== 'all') {
            result = result.filter(p => p.macroId === macroFilter);
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            result = result.filter(p => statusFilter === 'active' ? p.isActive : !p.isActive);
        }

        // Apply search query
        if (searchQuery) {
            result = result.filter(
                p =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.processCode.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply sorting
        result = [...result].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'code':
                    comparison = (a.processCode || '').localeCompare(b.processCode || '');
                    break;
                case 'title':
                    comparison = (a.title || '').localeCompare(b.title || '');
                    break;
                case 'recent':
                    comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                    break;
                default:
                    comparison = 0;
            }
            // For 'recent', desc means newest first, which is what we did naturally above.
            // If sortOrder is asc, we reverse it.
            return sortOrder === 'asc' ? -comparison : comparison;
        });

        // Apply search limit
        if (searchQuery) {
            result = result.slice(0, 5);
        }

        setFilteredProcesses(result);
    }, [searchQuery, macroFilter, statusFilter, sortBy, sortOrder, processes]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [processesData, macrosData] = await Promise.all([
                ProcessResource.getAll(),
                MacroResource.getAll({ limit: 100 })
            ]);
            setProcesses(processesData);
            setFilteredProcesses(processesData);
            setMacros(macrosData.data || []);
        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les données',
                variant: 'destructive',
            });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectProcess = (id: string) => {
        router.push(`/suivi-et-amelioration/process/${id}/feedback`);
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
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-600" />
                    Suivi et Amélioration
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                    Sélectionnez un processus pour évaluer son efficacité et proposer des améliorations.
                </p>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center">
                <div className="relative flex-1 max-w-xl w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un processus (nom ou code)..."
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                    />
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Select value={macroFilter} onValueChange={setMacroFilter}>
                        <SelectTrigger className="w-[180px] bg-white border-gray-300 rounded-xl shadow-sm h-11">
                            <SelectValue placeholder="Macro-processus" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">Tous les macros</SelectItem>
                            {macros.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.code} - {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-300 rounded-xl shadow-sm h-11">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="active">Actifs</SelectItem>
                            <SelectItem value="inactive">Inactifs</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[160px] bg-white border-gray-300 rounded-xl shadow-sm h-11">
                            <SelectValue placeholder="Trier par" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="recent">Plus récents</SelectItem>
                            <SelectItem value="code">Code</SelectItem>
                            <SelectItem value="title">Titre</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(order => order === 'desc' ? 'asc' : 'desc')}
                        title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                        className="h-11 w-11 rounded-xl border-gray-300 shadow-sm bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                    >
                        {sortOrder === 'asc' ? <ArrowUpAZ className="h-5 w-5" /> : <ArrowDownZA className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Process List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProcesses.map((process) => {
                    const macro = macros.find(m => m.id === process.macroId);
                    return (
                        <div
                            key={process.id}
                            onClick={() => handleSelectProcess(process.id)}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {process.processCode}
                                        </span>
                                        {macro && (
                                            <span className="text-xs text-gray-500 font-medium">
                                                {macro.code}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {process.title}
                                    </h3>
                                </div>
                            </div>

                            <p className="text-gray-600 text-sm flex-grow line-clamp-3 mb-6">
                                {process.description}
                            </p>

                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-sm text-blue-600 font-medium group-hover:text-blue-700">
                                <span className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Évaluer ce processus
                                </span>
                                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredProcesses.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun processus trouvé</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Essayez de modifier vos critères de recherche.
                    </p>
                </div>
            )}
        </div>
    );
}
