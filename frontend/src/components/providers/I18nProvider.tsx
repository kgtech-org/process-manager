'use client';

import { useEffect, useState } from 'react';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  useEffect(() => {
    // Dynamically import i18n only on client side
    import('@/lib/i18n').then(() => {
      setIsI18nInitialized(true);
    });
  }, []);

  // Render children immediately - i18n will be ready when components try to use it
  return <>{children}</>;
}
