'use client';

import { useEffect, useState } from 'react';
import { getEnvironment, type Environment } from '@/lib/electron/environment';
import { Badge } from '@/components/ui/badge';

export function EnvironmentIndicator() {
  const [environment, setEnvironment] = useState<Environment | null>(null);

  useEffect(() => {
    setEnvironment(getEnvironment());
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !environment) {
    return null;
  }

  const getVariant = () => {
    switch (environment) {
      case 'electron':
        return 'default';
      case 'browser-pwa':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getLabel = () => {
    switch (environment) {
      case 'electron':
        return 'Desktop';
      case 'browser-pwa':
        return 'PWA';
      default:
        return 'Browser';
    }
  };

  return (
    <Badge variant={getVariant()} className="fixed bottom-4 left-4 z-50">
      {getLabel()}
    </Badge>
  );
}
