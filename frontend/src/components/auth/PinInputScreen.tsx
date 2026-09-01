'use client';

import React, { useState } from 'react';
import { PinInput } from './PinInput';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface PinInputScreenProps {
    email: string;
    onSuccess: (data: any) => void;
    onForgotPin: () => void;
    onBack: () => void;
}

export const PinInputScreen: React.FC<PinInputScreenProps> = ({
    email,
    onSuccess,
    onForgotPin,
    onBack,
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginWithPin } = useAuth();
    const { t } = useTranslation('auth');

    const handlePinComplete = async (value: string) => {
        setPin(value);
        handleLogin(value);
    };

    const handleLogin = async (pinValue: string) => {
        try {
            setLoading(true);
            setError('');
            const response = await loginWithPin(email, pinValue);
            onSuccess(response);
        } catch (err: any) {
            setError(err.message || t('login.invalidPin'));
            setPin(''); // Clear PIN on error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Le titre et le sous-titre vivent dans l'en-tête de carte du LoginForm,
                qui distingue l'écran PIN de l'écran OTP. */}
            <p className="text-center text-sm text-gray-500">
                {t('login.pinHelp')}
            </p>

            {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200 text-center">
                    {error}
                </div>
            )}

            <div className="flex justify-center py-2">
                <PinInput
                    length={6}
                    value={pin}
                    onChange={setPin}
                    onComplete={handlePinComplete}
                    disabled={loading}
                    error={!!error}
                    mask
                />
            </div>

            <div className="space-y-3">
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                    onClick={onForgotPin}
                    disabled={loading}
                >
                    {t('login.forgotPin')}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onBack}
                    disabled={loading}
                >
                    <Mail className="mr-2 h-4 w-4" />
                    {t('login.requestOtp')}
                </Button>
            </div>
        </div>
    );
};
