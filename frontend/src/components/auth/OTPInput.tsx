'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = '••••••',
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Split value into 6 digits
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const focusNextInput = (index: number) => {
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const focusPrevInput = (index: number) => {
    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    }
  };

  const handleInputChange = (index: number, inputValue: string) => {
    // Get only the last entered digit
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    
    // Update the digits array
    const newDigits = [...digits];
    newDigits[index] = digit;
    
    // Create the new value
    const newValue = newDigits.join('').replace(/\s+$/, '');
    onChange(newValue);

    // Move to next input if digit was entered
    if (digit) {
      focusNextInput(index);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (digits[index]) {
        // Clear current digit
        const newDigits = [...digits];
        newDigits[index] = '';
        const newValue = newDigits.join('').replace(/\s+$/, '');
        onChange(newValue);
      } else {
        // Move to previous input
        focusPrevInput(index);
        // Clear previous digit
        const newDigits = [...digits];
        if (index > 0) {
          newDigits[index - 1] = '';
          const newValue = newDigits.join('').replace(/\s+$/, '');
          onChange(newValue);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusPrevInput(index);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusNextInput(index);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    onChange(digits);
    
    // Focus the next empty input
    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setActiveIndex(nextIndex);
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    // Select the content when focused
    inputRefs.current[index]?.select();
  };

  // Auto-focus first input when component mounts
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
      setActiveIndex(0);
    }
  }, [disabled]);

  return (
    <div className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`w-12 h-12 text-center text-lg font-semibold border-2 rounded-lg transition-all ${
            activeIndex === index
              ? 'border-blue-500 ring-2 ring-blue-200'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder="•"
          autoComplete="off"
          aria-label={`Digit ${index + 1} of verification code`}
        />
      ))}
    </div>
  );
};