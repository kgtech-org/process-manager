'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { PinSetupScreen } from '@/components/auth/PinSetupScreen';

export default function SetupPinPage() {
    return (
        <AuthGuard>
            <div className="flex min-h-screen items-center justify-center p-4">
                <PinSetupScreen />
            </div>
        </AuthGuard>
    );
}
