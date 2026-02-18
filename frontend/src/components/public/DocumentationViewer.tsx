'use client';

import { useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    FileText,
    Layers,
    CheckSquare,
    Download,
    Search,
    BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PublicDocumentation, PublicMacro, PublicProcess } from '@/services/documentation.service';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DocumentationViewerProps {
    data: PublicDocumentation;
}

export function DocumentationViewer({ data }: DocumentationViewerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedMacros, setExpandedMacros] = useState<string[]>([]);
    const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);

    // Toggle macro expansion
    const toggleMacro = (macroId: string) => {
        setExpandedMacros(prev =>
            prev.includes(macroId)
                ? prev.filter(id => id !== macroId)
                : [...prev, macroId]
        );
    };

    // Toggle process expansion
    const toggleProcess = (processId: string) => {
        setExpandedProcesses(prev =>
            prev.includes(processId)
                ? prev.filter(id => id !== processId)
                : [...prev, processId]
        );
    };

    // Filter macros based on search query
    const filteredMacros = data.macros.filter(macro => {
        const query = searchQuery.toLowerCase();

        // Check if macro matches
        if (
            macro.name.toLowerCase().includes(query) ||
            macro.code.toLowerCase().includes(query) ||
            macro.description.toLowerCase().includes(query)
        ) {
            return true;
        }

        // Check if any process matches
        return macro.processes.some(process =>
            process.title.toLowerCase().includes(query) ||
            process.processCode.toLowerCase().includes(query) ||
            process.description.toLowerCase().includes(query) ||
            // Check if any task matches
            process.tasks.some(task =>
                task.description.toLowerCase().includes(query) ||
                task.code.toLowerCase().includes(query)
            )
        );
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                            <BookOpen className="w-6 h-6 mr-2 text-blue-600" />
                            Process Documentation
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Last updated: {data.generatedAt ? format(new Date(data.generatedAt), 'MMMM d, yyyy HH:mm') : 'Unknown'}
                        </p>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search documentation..."
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="h-[600px]">
                <div className="p-6 space-y-4">
                    {filteredMacros.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No documentation found matching your search.</p>
                        </div>
                    ) : (
                        filteredMacros.map((macro) => (
                            <div key={macro.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                {/* Macro Header */}
                                <div
                                    className={cn(
                                        "flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                                        expandedMacros.includes(macro.id) && "bg-gray-50 border-b border-gray-100"
                                    )}
                                    onClick={() => toggleMacro(macro.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedMacros.includes(macro.id) ? (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        )}
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                            {macro.code}
                                        </Badge>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{macro.name}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-1">{macro.shortDescription}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="ml-2">
                                        {macro.processes.length} Processes
                                    </Badge>
                                </div>

                                {/* Macro Content (Processes) */}
                                {expandedMacros.includes(macro.id) && (
                                    <div className="bg-gray-50/30 p-4 space-y-3 border-t border-gray-100">
                                        {macro.processes.map((process) => (
                                            <div key={process.id} className="border border-gray-200 rounded-md bg-white ml-4">
                                                {/* Process Header */}
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors",
                                                        expandedProcesses.includes(process.id) && "border-b border-gray-100"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleProcess(process.id);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expandedProcesses.includes(process.id) ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-mono text-xs">
                                                            {process.processCode}
                                                        </Badge>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 text-sm">{process.title}</h4>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {process.pdfUrl && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(process.pdfUrl, '_blank');
                                                                }}
                                                                title="Download PDF"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Process Content (Details & Tasks) */}
                                                {expandedProcesses.includes(process.id) && (
                                                    <div className="p-4 space-y-4 text-sm bg-white">
                                                        {/* Description */}
                                                        {process.description && (
                                                            <div className="text-gray-600 mb-4 bg-gray-50 p-3 rounded text-sm">
                                                                {process.description}
                                                            </div>
                                                        )}

                                                        {/* Tasks */}
                                                        <div>
                                                            <h5 className="font-medium text-gray-700 mb-2 flex items-center text-xs uppercase tracking-wider">
                                                                <CheckSquare className="w-3 h-3 mr-1.5" />
                                                                Tasks
                                                            </h5>
                                                            <div className="space-y-2">
                                                                {process.tasks.map((task, index) => (
                                                                    <div key={index} className="flex gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded">
                                                                        <div className="font-mono text-xs text-gray-400 w-16 shrink-0 pt-0.5">
                                                                            {task.code}
                                                                        </div>
                                                                        <div className="text-gray-700">
                                                                            {task.description}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
