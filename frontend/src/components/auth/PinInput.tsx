import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    className?: string;
    error?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
    className,
    error = false,
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize refs array
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    const handleChange = (index: number, char: string) => {
        if (disabled) return;

        // Only allow numbers
        if (!/^\d*$/.test(char)) return;

        const newValue = value.split('');
        newValue[index] = char;
        const newPin = newValue.join('');

        onChange(newPin);

        // Auto-focus next input
        if (char && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Check if complete
        if (newPin.length === length && onComplete) {
            onComplete(newPin);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === 'Backspace') {
            if (!value[index] && index > 0) {
                // If current is empty, move back and delete
                const newValue = value.split('');
                newValue[index - 1] = '';
                onChange(newValue.join(''));
                inputRefs.current[index - 1]?.focus();
            } else {
                // Just delete current
                const newValue = value.split('');
                newValue[index] = '';
                onChange(newValue.join(''));
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        if (disabled) return;

        const pastedData = e.clipboardData.getData('text').slice(0, length).replace(/[^\d]/g, '');
        if (pastedData) {
            onChange(pastedData);

            // Focus appropriate input
            const nextIndex = Math.min(pastedData.length, length - 1);
            inputRefs.current[nextIndex]?.focus();

            if (pastedData.length === length && onComplete) {
                onComplete(pastedData);
            }
        }
    };

    return (
        <div className={cn("flex gap-2 justify-center", className)}>
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        // Assign ref without returning it
                        inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={value[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={cn(
                        "w-10 h-12 text-center text-xl font-bold border-2 rounded-md transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
                        error ? "border-red-500 bg-red-50" : "border-gray-200 bg-white",
                        disabled && "opacity-50 cursor-not-allowed bg-gray-100"
                    )}
                />
            ))}
        </div>
    );
};
