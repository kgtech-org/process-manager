'use client';

import React, { useState } from 'react';
import { PinInput } from './PinInput';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface PinSetupScreenProps {
    onSuccess?: () => void;
}

export const PinSetupScreen: React.FC<PinSetupScreenProps> = ({ onSuccess }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState(1); // 1: Enter PIN, 2: Confirm PIN
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation('auth');
    const { t: tCommon } = useTranslation('common');
    const router = useRouter();

    const { refreshUser } = useAuth();

    const handlePinComplete = (value: string) => {
        if (step === 1) {
            setPin(value);
            setStep(2);
            setError('');
        } else {
            setConfirmPin(value);
            if (value !== pin) {
                setError(t('pin.mismatch') || 'PINs do not match');
                // Don't clear confirmPin immediately, let user see it or just show error
                // Actually clearing it is better UX if it mismatches, but let's just show error
                return;
            }
            setError('');
        }
    };

    const handleConfirm = () => {
        if (confirmPin !== pin) {
            setError(t('pin.mismatch') || 'PINs do not match');
            return;
        }
        handleSetPin(pin);
    }

    const handleSetPin = async (value: string) => {
        try {
            setLoading(true);
            await authService.setPin(value);
            await refreshUser(); // Update user context to reflect new PIN status

            setSuccess(t('pin.success') || 'PIN set up successfully');

            // Wait a bit to show success message
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.push('/macros');
                }
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Failed to set PIN');
            // Reset flow
            setStep(1);
            setPin('');
            setConfirmPin('');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
            setPin('');
            setConfirmPin('');
            setError('');
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                    {step === 1 ? (t('pin.setupTitle') || 'Set up PIN') : (t('pin.confirmTitle') || 'Confirm PIN')}
                </CardTitle>
                <CardDescription>
                    {step === 1
                        ? (t('pin.setupDesc') || 'Create a 6-digit PIN for faster login')
                        : (t('pin.confirmDesc') || 'Re-enter your PIN to confirm')
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200 text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200 text-center">
                        {success}
                    </div>
                )}

                <div className="flex justify-center py-4">
                    <PinInput
                        length={6}
                        value={step === 1 ? pin : confirmPin}
                        onChange={step === 1 ? setPin : setConfirmPin}
                        onComplete={handlePinComplete}
                        disabled={loading || !!success}
                        error={!!error}
                    />
                </div>

                <div className="space-y-3">
                    {step === 2 && (
                        <>
                            <Button
                                className="w-full"
                                onClick={handleConfirm}
                                disabled={loading || confirmPin.length !== 6 || !!success}
                            >
                                {loading ? tCommon('loading') : tCommon('confirm')}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleBack}
                                disabled={loading || !!success}
                            >
                                {tCommon('back') || 'Back'}
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
