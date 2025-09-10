'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobPosition } from '@/lib/validation';

interface JobPositionSelectorProps {
  jobPositions: JobPosition[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  departmentId?: string;
}

export const JobPositionSelector: React.FC<JobPositionSelectorProps> = ({
  jobPositions,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select a job position',
  departmentId,
}) => {
  // Filter job positions by department if specified
  const filteredPositions = departmentId
    ? jobPositions.filter(position => position.departmentId === departmentId && position.active)
    : jobPositions.filter(position => position.active);

  // Group by level for better organization
  const positionsByLevel = filteredPositions.reduce((groups, position) => {
    const level = position.level || 'Other';
    if (!groups[level]) {
      groups[level] = [];
    }
    groups[level].push(position);
    return groups;
  }, {} as Record<string, JobPosition[]>);

  const levelOrder = ['Senior', 'Mid', 'Junior', 'Lead', 'Manager', 'Director', 'Other'];
  const sortedLevels = levelOrder.filter(level => positionsByLevel[level]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {sortedLevels.length > 0 ? (
          sortedLevels.map((level) => (
            <div key={level}>
              {sortedLevels.length > 1 && (
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {level}
                </div>
              )}
              {positionsByLevel[level].map((position) => (
                <SelectItem key={position.id} value={position.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{position.title}</span>
                    {position.description && (
                      <span className="text-xs text-gray-500 truncate max-w-64">
                        {position.description}
                      </span>
                    )}
                    {position.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {position.requiredSkills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="inline-block px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {position.requiredSkills.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{position.requiredSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))
        ) : (
          <SelectItem value="" disabled>
            {departmentId ? 'No positions available for this department' : 'No job positions available'}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};