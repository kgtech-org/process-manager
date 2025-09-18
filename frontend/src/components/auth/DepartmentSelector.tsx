'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Department } from '@/lib/validation';

interface DepartmentSelectorProps {
  departments: Department[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({
  departments,
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select a department',
}) => {
  // Group departments by parent (hierarchy support)
  const rootDepartments = departments.filter(dept => !dept.parentId && dept.active);
  const childDepartments = departments.filter(dept => dept.parentId && dept.active);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {rootDepartments.map((department) => {
          const children = childDepartments.filter(child => child.parentId === department.id);
          
          return (
            <div key={department.id}>
              <SelectItem value={department.id}>
                <div className="flex items-center">
                  <span className="font-medium">{department.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({department.code})</span>
                </div>
              </SelectItem>
              
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  <div className="flex items-center pl-4">
                    <span>└ {child.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({child.code})</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          );
        })}
        
        {rootDepartments.length === 0 && (
          <SelectItem value="no-departments" disabled>
            No departments available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};