'use client';

/**
 * Environment Indicator Component
 *
 * Shows the current runtime environment (Electron, PWA, Browser).
 * Only visible in development mode.
 */

import { useState, useEffect } from 'react';
import { getEnvironmentContext, type EnvironmentContext } from '@/lib/electron/environment';
import { Badge } from '@/components/ui/badge';
import { Monitor, Globe, Smartphone } from 'lucide-react';

interface EnvironmentIndicatorProps {
  className?: string;
  showAlways?: boolean;
}

/**
 * Displays a compact badge indicating the current runtime environment and platform.
 *
 * @param showAlways - If true, render the badge regardless of development mode; otherwise only render in development.
 * @returns A Badge element showing an environment icon, label, and platform when visible, or `null` when not rendered.
 */
export function EnvironmentIndicator({
  className,
  showAlways = false,
}: EnvironmentIndicatorProps) {
  const [context, setContext] = useState<EnvironmentContext | null>(null);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setContext(getEnvironmentContext());
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);

  // Only show in development mode unless showAlways is true
  if (!showAlways && !isDev) {
    return null;
  }

  if (!context) {
    return null;
  }

  const getIcon = () => {
    switch (context.environment) {
      case 'electron':
        return <Monitor className="h-3 w-3" />;
      case 'browser-pwa':
        return <Smartphone className="h-3 w-3" />;
      default:
        return <Globe className="h-3 w-3" />;
    }
  };

  const getLabel = () => {
    switch (context.environment) {
      case 'electron':
        return 'Electron';
      case 'browser-pwa':
        return 'PWA';
      default:
        return 'Browser';
    }
  };

  const getVariant = () => {
    switch (context.environment) {
      case 'electron':
        return 'default';
      case 'browser-pwa':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Badge
      variant={getVariant() as 'default' | 'secondary' | 'outline'}
      className={className}
      data-testid="environment-indicator"
    >
      {getIcon()}
      <span className="ml-1">{getLabel()}</span>
      <span className="ml-1 text-xs opacity-70">({context.platform})</span>
    </Badge>
  );
}

/**
 * Displays a compact debug panel that lists feature flags from the current environment when running in development.
 *
 * Each feature is shown with a small colored indicator: green when truthy, red when falsy.
 *
 * @returns A JSX element containing the feature flags panel, or `null` when not visible.
 */
export function FeatureFlagsDebug() {
  const [context, setContext] = useState<EnvironmentContext | null>(null);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setContext(getEnvironmentContext());
    setIsDev(process.env.NODE_ENV === 'development');
  }, []);

  if (!isDev || !context) {
    return null;
  }

  const features = Object.entries(context.features);

  return (
    <div
      className="fixed bottom-4 left-4 p-4 bg-background border rounded-lg shadow-lg max-w-xs text-xs z-50"
      data-testid="feature-flags-debug"
    >
      <h4 className="font-semibold mb-2">Feature Flags</h4>
      <div className="grid grid-cols-2 gap-1">
        {features.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                value ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="truncate">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}