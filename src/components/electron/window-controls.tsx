'use client';

/**
 * Window Controls Component
 *
 * Custom window controls for the Electron app's frameless window.
 * Provides minimize, maximize, and close buttons.
 */

import { useState, useEffect, useCallback } from 'react';
import { isElectron, getPlatform } from '@/lib/electron/environment';
import { windowControls } from '@/lib/electron/ipc-client';
import { cn } from '@/lib/utils';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

interface WindowControlsProps {
  className?: string;
}

/**
 * Render frameless-window controls (minimize, maximize/restore, close) for non-macOS Electron apps.
 *
 * @param className - Optional CSS class(es) applied to the control container
 * @returns A React element containing the window control buttons, or `null` when not running in Electron or on macOS
 */
export function WindowControls({ className }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const platform = getPlatform();

  // Don't render in browser
  if (!isElectron()) {
    return null;
  }

  // Don't render on macOS (uses native traffic light buttons)
  if (platform === 'macos') {
    return null;
  }

  // Subscribe to window state changes
  useEffect(() => {
    if (!isElectron()) return;

    const checkMaximized = async () => {
      const maximized = await windowControls.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    // Listen for maximize/unmaximize events
    const unsubscribe = window.electron.window.onMaximized((maximized) => {
      setIsMaximized(maximized as boolean);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleMinimize = useCallback(() => {
    windowControls.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    windowControls.maximize();
  }, []);

  const handleClose = useCallback(() => {
    windowControls.close();
  }, []);

  return (
    <div
      className={cn(
        'flex items-center -webkit-app-region-no-drag',
        className
      )}
      data-testid="window-controls"
    >
      {/* Minimize */}
      <button
        onClick={handleMinimize}
        className="h-8 w-12 flex items-center justify-center hover:bg-muted/50 transition-colors"
        aria-label="Minimize"
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* Maximize/Restore */}
      <button
        onClick={handleMaximize}
        className="h-8 w-12 flex items-center justify-center hover:bg-muted/50 transition-colors"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Maximize2 className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Close */}
      <button
        onClick={handleClose}
        className="h-8 w-12 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Draggable Title Bar Region
 *
 * Makes an area draggable for window movement in frameless windows.
 */
interface DraggableRegionProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Wraps content in a draggable region for frameless Electron windows when running inside Electron.
 *
 * Renders a div with `-webkit-app-region: drag` (and the `-webkit-app-region-drag` class) when in Electron; otherwise renders a plain div.
 *
 * @param children - Content to render inside the region
 * @param className - Optional class name(s) to apply to the container
 * @returns A div that enables window dragging in Electron or a regular div outside Electron
 */
export function DraggableRegion({ children, className }: DraggableRegionProps) {
  if (!isElectron()) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn('-webkit-app-region-drag', className)}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Non-Draggable Region
 *
 * Prevents dragging within a draggable region (for buttons, inputs, etc.)
 */
interface NonDraggableRegionProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Renders a container that disables window dragging in Electron frameless windows and falls back to a normal div otherwise.
 *
 * @returns A `div` element that applies `-webkit-app-region: no-drag` when running in Electron, otherwise a standard `div`; contains the provided `children`.
 */
export function NonDraggableRegion({ children, className }: NonDraggableRegionProps) {
  if (!isElectron()) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn('-webkit-app-region-no-drag', className)}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {children}
    </div>
  );
}