'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { STAKEHOLDERS } from '@/lib/validation/process';

interface StakeholderSelectProps {
  value: string[];
  onChange: (stakeholders: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const StakeholderSelect: React.FC<StakeholderSelectProps> = ({
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Select stakeholders...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStakeholders = STAKEHOLDERS.filter((stakeholder) =>
    stakeholder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStakeholder = (stakeholder: string) => {
    if (value.includes(stakeholder)) {
      onChange(value.filter((s) => s !== stakeholder));
    } else {
      onChange([...value, stakeholder]);
    }
  };

  const removeStakeholder = (stakeholder: string) => {
    onChange(value.filter((s) => s !== stakeholder));
  };

  return (
    <div className="relative">
      {/* Selected Stakeholders */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((stakeholder) => (
            <div
              key={stakeholder}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{stakeholder}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeStakeholder(stakeholder)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <div className="relative">
        <input
          type="text"
          placeholder={value.length === 0 ? placeholder : 'Add more...'}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Dropdown */}
        {isOpen && !disabled && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
              }}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredStakeholders.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No stakeholders found
                </div>
              ) : (
                filteredStakeholders.map((stakeholder) => {
                  const isSelected = value.includes(stakeholder);
                  return (
                    <button
                      key={stakeholder}
                      type="button"
                      onClick={() => {
                        toggleStakeholder(stakeholder);
                        setSearchTerm('');
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="text-sm">{stakeholder}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
