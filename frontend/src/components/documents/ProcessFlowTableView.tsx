'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { List } from 'lucide-react';
import type { ProcessGroup, ProcessStep } from '@/lib/resources/document';

interface ProcessFlowTableViewProps {
  processGroups: ProcessGroup[];
}

export const ProcessFlowTableView: React.FC<ProcessFlowTableViewProps> = ({
  processGroups,
}) => {
  const { t } = useTranslation('documents');

  if (processGroups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>{t('processFlow.emptyState')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Flatten process groups and steps into table rows
  const tableRows: Array<{
    groupOrder: number;
    groupTitle: string;
    stepOrder: number | null;
    stepTitle: string | null;
    responsible: string | null;
    outputs: string[];
    durations: string[];
    isGroupRow: boolean;
  }> = [];

  processGroups.forEach((group) => {
    if (group.processSteps.length === 0) {
      // Group with no steps
      tableRows.push({
        groupOrder: group.order,
        groupTitle: group.title,
        stepOrder: null,
        stepTitle: null,
        responsible: null,
        outputs: [],
        durations: [],
        isGroupRow: true,
      });
    } else {
      // Group with steps
      group.processSteps.forEach((step, stepIndex) => {
        tableRows.push({
          groupOrder: group.order,
          groupTitle: stepIndex === 0 ? group.title : '', // Only show group title on first step
          stepOrder: step.order,
          stepTitle: step.title,
          responsible: step.responsible || null,
          outputs: step.outputs || [],
          durations: step.durations || [],
          isGroupRow: false,
        });
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('processFlow.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('processFlow.groupOrder')}</TableHead>
                <TableHead className="w-[250px]">{t('processFlow.groupTitle')}</TableHead>
                <TableHead className="w-[100px]">{t('processFlow.stepOrder')}</TableHead>
                <TableHead className="w-[250px]">{t('processFlow.stepTitle')}</TableHead>
                <TableHead className="w-[200px]">{t('processFlow.responsible')}</TableHead>
                <TableHead>{t('processFlow.outputs')}</TableHead>
                <TableHead>{t('processFlow.durations')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row, index) => (
                <TableRow key={index} className={row.isGroupRow ? 'bg-muted/50' : ''}>
                  {/* Group Order */}
                  <TableCell>
                    {row.groupTitle && (
                      <Badge variant="default" className="font-mono">
                        {row.groupOrder}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Group Title */}
                  <TableCell className="font-semibold">
                    {row.groupTitle}
                  </TableCell>

                  {/* Step Order */}
                  <TableCell>
                    {row.stepOrder !== null && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {row.groupOrder}.{row.stepOrder}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Step Title */}
                  <TableCell className="font-medium">
                    {row.stepTitle}
                  </TableCell>

                  {/* Responsible */}
                  <TableCell className="text-sm text-muted-foreground">
                    {row.responsible || (row.isGroupRow ? '' : '—')}
                  </TableCell>

                  {/* Outputs */}
                  <TableCell>
                    {row.outputs.length > 0 ? (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {row.outputs.map((output, idx) => (
                          <li key={idx}>{output}</li>
                        ))}
                      </ul>
                    ) : row.isGroupRow ? null : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Durations */}
                  <TableCell>
                    {row.durations.length > 0 ? (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {row.durations.map((duration, idx) => (
                          <li key={idx}>{duration}</li>
                        ))}
                      </ul>
                    ) : row.isGroupRow ? null : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
