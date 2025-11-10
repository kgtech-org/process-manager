'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { MacroResource, Macro } from '@/lib/resources/macro';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface ProcessDetail {
  id: string;
  processCode: string;
  title: string;
  description?: string;
  shortDescription?: string;
  version: string;
  status: string;
  macroId: string;
  isActive: boolean;
  reference: string;
  metadata: {
    objectives: string[];
    implicatedActors: string[];
    managementRules: string[];
    terminology: string[];
  };
  contributors: {
    authors: Array<{ userId: string; name: string; role: string }>;
    verifiers: Array<{ userId: string; name: string; role: string }>;
    validators: Array<{ userId: string; name: string; role: string }>;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('macros');
  const macroId = params.id as string;
  const processId = params.processId as string;

  const [macro, setMacro] = useState<Macro | null>(null);
  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load macro and process in parallel
        const [macroData, processResponse] = await Promise.all([
          MacroResource.getById(macroId),
          apiClient.get(`/documents/${processId}`)
        ]);

        setMacro(macroData);

        if (processResponse.success && processResponse.data) {
          setProcess(processResponse.data);
        } else {
          setError('Process not found');
        }
      } catch (err) {
        console.error('Failed to load process:', err);
        setError('Failed to load process details');
      } finally {
        setLoading(false);
      }
    };

    if (macroId && processId) {
      loadData();
    }
  }, [macroId, processId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !process || !macro) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error || 'Process not found'}</p>
          <Button
            onClick={() => router.push(`/macros/${macroId}`)}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Macro
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Macros', href: '/macros' },
    { label: `${macro.code} - ${macro.name}`, href: `/macros/${macroId}` },
    { label: `${process.processCode} - ${process.title}` },
  ];

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      {/* Back Button */}
      <Button
        onClick={() => router.push(`/macros/${macroId}`)}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Macro
      </Button>

      {/* Process Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Badge variant="secondary" className="text-lg px-3 py-1 font-mono">
                {process.processCode}
              </Badge>
              <Badge
                variant={process.isActive ? 'default' : 'secondary'}
                className="capitalize"
              >
                {process.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge
                className={statusColors[process.status] || 'bg-gray-100 text-gray-800'}
              >
                {process.status}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {process.title}
            </h1>
            {process.shortDescription && (
              <p className="text-gray-600 text-lg">{process.shortDescription}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Process Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {process.description ? (
              <p className="text-gray-700 whitespace-pre-wrap">{process.description}</p>
            ) : (
              <p className="text-gray-500 italic">No description available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Version</p>
              <p className="font-medium">{process.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Reference</p>
              <p className="font-medium font-mono text-sm">{process.reference}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Created</p>
              <p className="font-medium">
                {new Date(process.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Last Updated</p>
              <p className="font-medium">
                {new Date(process.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata Sections */}
      {process.metadata.objectives.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {process.metadata.objectives.map((objective, index) => (
                <li key={index} className="text-gray-700">{objective}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {process.metadata.implicatedActors.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Implicated Actors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {process.metadata.implicatedActors.map((actor, index) => (
                <Badge key={index} variant="outline">{actor}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {process.metadata.managementRules.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Management Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {process.metadata.managementRules.map((rule, index) => (
                <li key={index} className="text-gray-700">{rule}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Contributors */}
      {(process.contributors.authors.length > 0 ||
        process.contributors.verifiers.length > 0 ||
        process.contributors.validators.length > 0) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contributors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {process.contributors.authors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Authors</h4>
                <div className="space-y-2">
                  {process.contributors.authors.map((author, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{author.name}</span>
                      <Badge variant="outline">{author.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {process.contributors.verifiers.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Verifiers</h4>
                <div className="space-y-2">
                  {process.contributors.verifiers.map((verifier, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{verifier.name}</span>
                      <Badge variant="outline">{verifier.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {process.contributors.validators.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Validators</h4>
                <div className="space-y-2">
                  {process.contributors.validators.map((validator, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{validator.name}</span>
                      <Badge variant="outline">{validator.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
